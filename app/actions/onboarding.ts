'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateFutureSelfProfile } from '@/lib/futureself/generate'

export type OnboardingAnswers = {
  name: string
  friendsDescription: string
  strongestBeliefs: string
  lifeShapingLessons: string
  adviceGiven: string
  biggestGoals: string
  rememberFor: string
  tone: string
  avoidTopics: string
  helpUnderstand: string
}

type SaveResult =
  | { saved: true }
  | {
      saved: false
      reason: 'not-configured' | 'unauthenticated' | 'db-error'
      detail?: string
    }

export async function saveOnboardingAction(
  answers: OnboardingAnswers
): Promise<SaveResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { saved: false, reason: 'not-configured' }
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (!token) {
    return { saved: false, reason: 'unauthenticated' }
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { saved: false, reason: 'unauthenticated' }
  }

  // Ensure a profiles row exists (the trigger creates it on signup, but this
  // is a safety net for users who signed up before the trigger was deployed).
  await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email })

  // Generate the FutureSelf identity from the raw answers
  const generated = generateFutureSelfProfile(answers)

  const { error } = await supabase.from('futureself_profiles').upsert(
    {
      user_id: user.id,
      display_name: generated.display_name,
      personality_summary: generated.personality_summary,
      tone: generated.tone,
      boundaries: generated.boundaries,
      response_style: generated.response_style,
      onboarding: answers,
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return { saved: false, reason: 'db-error', detail: error.message }
  }

  return { saved: true }
}

// ── Regenerate ────────────────────────────────────────────────────────────────

type RegenerateResult = { success: true } | { success: false; error: string }

export async function regenerateProfileAction(): Promise<RegenerateResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { success: false, error: 'Supabase not configured.' }

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return { success: false, error: 'Not authenticated.' }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return { success: false, error: 'Not authenticated.' }

  const { data: existing, error: fetchError } = await supabase
    .from('futureself_profiles')
    .select('onboarding')
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing?.onboarding) {
    return { success: false, error: 'No onboarding data found.' }
  }

  const generated = generateFutureSelfProfile(existing.onboarding as OnboardingAnswers)

  const { error: updateError } = await supabase
    .from('futureself_profiles')
    .update({
      display_name: generated.display_name,
      personality_summary: generated.personality_summary,
      tone: generated.tone,
      boundaries: generated.boundaries,
      response_style: generated.response_style,
    })
    .eq('user_id', user.id)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath('/me')
  return { success: true }
}
