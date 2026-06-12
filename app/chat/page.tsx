import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { buildSystemPrompt, type MemoryRecord } from '@/lib/futureself/prompt'
import { ChatInterface } from './chat-interface'
import { ChatViewLocal } from './chat-view-local'
import type { OnboardingAnswers } from '@/app/actions/onboarding'
import type { GeneratedProfile } from '@/lib/futureself/generate'

export const metadata = {
  title: 'Chat — FutureSelf',
}

type ProfileRow = {
  display_name: string | null
  personality_summary: string | null
  tone: string | null
  boundaries: string | null
  onboarding: OnboardingAnswers | null
  response_style: string | null
  voice_enabled: boolean | null
  voice_style: string | null
}

export default async function ChatPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <ChatViewLocal />
  }

  const supabase = await createAuthenticatedClient()
  if (!supabase) redirect('/login')

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: row, error: profileError } = await supabase
    .from('futureself_profiles')
    .select('display_name, personality_summary, tone, boundaries, onboarding, response_style, voice_enabled, voice_style')
    .eq('user_id', user.id)
    .single<ProfileRow>()

  if (profileError || !row?.onboarding) redirect('/onboarding')

  const profile: GeneratedProfile = {
    display_name: row.display_name ?? row.onboarding.name,
    personality_summary: row.personality_summary ?? '',
    tone: row.tone ?? row.onboarding.tone,
    boundaries: row.boundaries ?? row.onboarding.avoidTopics,
    response_style: (row.response_style as GeneratedProfile['response_style']) ?? 'Balanced',
  }

  type CloneSampleRow = { clone_voice_id: string | null }

  // Load memories + voice clone status in parallel
  const [memoriesResult, cloneSampleResult] = await Promise.all([
    supabase
      .from('futureself_memories')
      .select('memory_type, content, importance')
      .eq('user_id', user.id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('voice_samples')
      .select('clone_voice_id')
      .eq('user_id', user.id)
      .eq('clone_status', 'ready')
      .not('clone_voice_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<CloneSampleRow>(),
  ])

  const memories: MemoryRecord[] = memoriesResult.data ?? []
  const cloneVoiceId = cloneSampleResult.data?.clone_voice_id ?? null
  const systemPrompt = buildSystemPrompt(profile, row.onboarding, memories)

  return (
    <ChatInterface
      profile={profile}
      answers={row.onboarding}
      userId={user.id}
      systemPrompt={systemPrompt}
      voiceEnabled={row.voice_enabled === true}
      voiceStyle={row.voice_style ?? 'calm'}
      cloneVoiceId={cloneVoiceId}
    />
  )
}
