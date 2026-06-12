import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { ProfileViewLocal } from './profile-view-local'
import { ProfileContent } from './profile-content'
import { getPortraits, type Portrait } from '@/lib/futureself/portrait'
import type { OnboardingAnswers } from '@/app/actions/onboarding'
import type { GeneratedProfile } from '@/lib/futureself/generate'

export const metadata = {
  title: 'My FutureSelf',
}

type FutureSelfRow = {
  display_name: string | null
  personality_summary: string | null
  tone: string | null
  boundaries: string | null
  onboarding: OnboardingAnswers | null
  username: string | null
  is_public: boolean
  response_style: string | null
  voice_enabled: boolean | null
  voice_style: string | null
}

export default async function MePage() {
  // If Supabase is not configured, fall back to localStorage-only display.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <ProfileViewLocal />
  }

  const supabase = await createAuthenticatedClient()
  if (!supabase) redirect('/login')

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: row, error: fetchError } = await supabase
    .from('futureself_profiles')
    .select(
      'display_name, personality_summary, tone, boundaries, onboarding, username, is_public, response_style, voice_enabled, voice_style'
    )
    .eq('user_id', user.id)
    .single<FutureSelfRow>()

  if (fetchError || !row || !row.onboarding) redirect('/onboarding')

  const profile: GeneratedProfile = {
    display_name: row.display_name ?? row.onboarding.name,
    personality_summary: row.personality_summary ?? '',
    tone: row.tone ?? row.onboarding.tone,
    boundaries: row.boundaries ?? row.onboarding.avoidTopics,
    response_style: (row.response_style as GeneratedProfile['response_style']) ?? 'Balanced',
  }

  type VoiceSampleRow = { audio_url: string; duration_seconds: number | null }
  type MemoryCountRow = { memory_type: string }

  const [portraits, refPhotosResult, voiceSampleResult, memoryCountResult] = await Promise.all([
    getPortraits(user.id, supabase),
    supabase.storage
      .from('future-portraits')
      .list(`${user.id}/input`, { limit: 1 }),
    supabase
      .from('voice_samples')
      .select('audio_url, duration_seconds')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<VoiceSampleRow>(),
    supabase
      .from('futureself_memories')
      .select('memory_type')
      .eq('user_id', user.id)
      .returns<MemoryCountRow[]>(),
  ])

  const hasReferencePhoto = (refPhotosResult.data?.length ?? 0) > 0

  const initialVoiceSample = voiceSampleResult.data
    ? { audioUrl: voiceSampleResult.data.audio_url, duration: voiceSampleResult.data.duration_seconds }
    : null

  const memoryRows = memoryCountResult.data ?? []
  const memoryCounts = memoryRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.memory_type] = (acc[r.memory_type] ?? 0) + 1
    return acc
  }, {})
  const totalMemories = memoryRows.length

  return (
    <ProfileContent
      profile={profile}
      answers={row.onboarding}
      username={row.username}
      isPublic={row.is_public}
      responseStyle={profile.response_style}
      portraits={portraits}
      hasReferencePhoto={hasReferencePhoto}
      voiceEnabled={row.voice_enabled ?? false}
      voiceStyle={(row.voice_style as import('@/lib/futureself/voice').VoiceStyle | null) ?? 'female-calm'}
      initialVoiceSample={initialVoiceSample}
      memoryCounts={memoryCounts}
      totalMemories={totalMemories}
    />
  )
}
