'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { ResponseStyle } from '@/lib/futureself/generate'

export type ProfileSettingsInput = {
  username: string
  isPublic: boolean
  responseStyle: ResponseStyle
}

type Result =
  | { saved: true; username: string }
  | { saved: false; error: string }

export async function saveProfileSettingsAction(
  input: ProfileSettingsInput
): Promise<Result> {
  const username = input.username.trim().toLowerCase()
  const { isPublic, responseStyle } = input

  if (username.length > 0) {
    if (username.length < 3)
      return { saved: false, error: 'Username must be at least 3 characters.' }
    if (username.length > 30)
      return { saved: false, error: 'Username must be 30 characters or fewer.' }
    if (!/^[a-z0-9_-]+$/.test(username))
      return {
        saved: false,
        error:
          'Username can only contain letters, numbers, hyphens, and underscores.',
      }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { saved: false, error: 'Supabase not configured.' }

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return { saved: false, error: 'Not authenticated.' }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return { saved: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('futureself_profiles')
    .update({
      username: username || null,
      is_public: isPublic,
      response_style: responseStyle,
    })
    .eq('user_id', user.id)

  if (error) {
    if (error.code === '23505')
      return { saved: false, error: 'That username is already taken.' }
    return { saved: false, error: error.message }
  }

  revalidatePath('/me')
  return { saved: true, username }
}
