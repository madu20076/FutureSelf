'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { VOICE_STYLES, type VoiceStyle } from '@/lib/futureself/voice'

type VoiceSettingsInput = {
  voiceEnabled: boolean
  voiceStyle: VoiceStyle
}

type Result = { saved: true } | { saved: false; error: string }

export async function saveVoiceSettingsAction(input: VoiceSettingsInput): Promise<Result> {
  if (!VOICE_STYLES.includes(input.voiceStyle)) {
    return { saved: false, error: 'Invalid voice style.' }
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

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { saved: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('futureself_profiles')
    .update({ voice_enabled: input.voiceEnabled, voice_style: input.voiceStyle })
    .eq('user_id', user.id)

  if (error) return { saved: false, error: error.message }

  revalidatePath('/me')
  return { saved: true }
}
