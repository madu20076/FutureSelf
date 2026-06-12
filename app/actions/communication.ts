'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import {
  generateCommunicationProfile,
  type CommunicationProfile,
  type CommunicationInput,
} from '@/lib/futureself/communication'

type Result<T> = { success: true; data: T } | { success: false; error: string }

async function getAuthedSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return null

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return { supabase, user }
}

export async function generateCommunicationAction(): Promise<Result<CommunicationProfile>> {
  const auth = await getAuthedSupabase()
  if (!auth) return { success: false, error: 'Not authenticated.' }
  const { supabase, user } = auth

  type MemRow      = { memory_type: string; content: string; importance: number }
  type RefRow      = { content: string }
  type SessionRow  = { id: string }
  type MsgRow      = { content: string }
  type CoachRow    = { report_json: { summary: string; biggestOpportunity: string; biggestRisk: string; momentumLabel: string } }

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch sessions first so we can query their messages
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(10)
    .returns<SessionRow[]>()

  const sessionIds = sessions?.map(s => s.id) ?? []

  const [memoriesRes, reflectionsRes, messagesRes, coachingRes] = await Promise.all([
    supabase
      .from('futureself_memories')
      .select('memory_type, content, importance')
      .eq('user_id', user.id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60)
      .returns<MemRow[]>(),
    supabase
      .from('futureself_memories')
      .select('content')
      .eq('user_id', user.id)
      .eq('source', 'weekly_reflection')
      .gte('created_at', monthAgo)
      .order('created_at', { ascending: false })
      .limit(12)
      .returns<RefRow[]>(),
    sessionIds.length > 0
      ? supabase
          .from('chat_messages')
          .select('content')
          .in('session_id', sessionIds)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(40)
          .returns<MsgRow[]>()
      : Promise.resolve({ data: [] as MsgRow[], error: null }),
    supabase
      .from('futureself_coaching_reports')
      .select('report_json')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<CoachRow>(),
  ])

  const coachingData = coachingRes.data?.report_json ?? null

  const input: CommunicationInput = {
    userMessages:   (messagesRes.data ?? []).map(m => m.content),
    memories:       memoriesRes.data    ?? [],
    reflections:    reflectionsRes.data ?? [],
    coachingReport: coachingData ? {
      summary:            coachingData.summary,
      biggestOpportunity: coachingData.biggestOpportunity,
      biggestRisk:        coachingData.biggestRisk,
      momentumLabel:      coachingData.momentumLabel,
    } : null,
  }

  let profile: CommunicationProfile
  try {
    profile = await generateCommunicationProfile(input)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Generation failed.' }
  }

  // Upsert — one row per user
  const { error: upsertErr } = await supabase
    .from('futureself_communication_profile')
    .upsert({
      user_id:             user.id,
      communication_style: profile.communicationStyle,
      decision_style:      profile.decisionStyle,
      motivation_style:    profile.motivationStyle,
      leadership_style:    profile.leadershipStyle,
      planning_style:      profile.planningStyle,
      risk_tolerance:      profile.riskTolerance,
      summary:             profile.summary,
      updated_at:          new Date().toISOString(),
    })

  if (upsertErr) console.error('[communication] upsert:', upsertErr.message)

  revalidatePath('/communication')
  revalidatePath('/dashboard')

  return { success: true, data: profile }
}
