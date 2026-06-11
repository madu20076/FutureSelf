'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type AuthState = { error: string } | undefined

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function setSessionCookie(accessToken: string, expiresIn: number) {
  const cookieStore = await cookies()
  cookieStore.set('sb-access-token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresIn,
    path: '/',
  })
}

export async function signupAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = createServerSupabase()
  if (!supabase) {
    return {
      error:
        'Authentication is not configured yet. Add your Supabase keys to .env.local to enable sign-up.',
    }
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
  }

  if (data.session) {
    await setSessionCookie(
      data.session.access_token,
      data.session.expires_in ?? 3600
    )
  }

  redirect('/onboarding')
}

export async function loginAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = createServerSupabase()
  if (!supabase) {
    return {
      error:
        'Authentication is not configured yet. Add your Supabase keys to .env.local to enable sign-in.',
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data.session) {
    await setSessionCookie(
      data.session.access_token,
      data.session.expires_in ?? 3600
    )
  }

  // Route returning users with an existing profile directly to /me
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authed = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${data.session!.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: existing } = await authed
    .from('futureself_profiles')
    .select('id')
    .eq('user_id', data.user!.id)
    .maybeSingle()

  redirect(existing ? '/me' : '/onboarding')
}

export async function logoutAction() {
  const supabase = createServerSupabase()
  if (supabase) {
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value
    if (token) {
      const authed = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        }
      )
      await authed.auth.signOut()
    }
  }

  const cookieStore = await cookies()
  cookieStore.delete('sb-access-token')

  redirect('/')
}
