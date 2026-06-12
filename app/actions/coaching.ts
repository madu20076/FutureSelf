'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateCoachingReport, type CoachingReport, type CoachingInput } from '@/lib/futureself/coaching'

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

export async function generateCoachingAction(): Promise<Result<CoachingReport>> {
  const auth = await getAuthedSupabase()
  if (!auth) return { success: false, error: 'Not authenticated.' }
  const { supabase, user } = auth

  type MemRow  = { memory_type: string; content: string; importance: number }
  type RefRow  = { content: string; created_at: string }
  type FocRow  = { focus_text: string; completed: boolean }

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const weekAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [memoriesRes, reflectionsRes, focusRes] = await Promise.all([
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
      .select('content, created_at')
      .eq('user_id', user.id)
      .eq('source', 'weekly_reflection')
      .gte('created_at', monthAgo)
      .order('created_at', { ascending: false })
      .limit(12)
      .returns<RefRow[]>(),
    supabase
      .from('futureself_focus')
      .select('focus_text, completed')
      .eq('user_id', user.id)
      .gte('focus_date', weekAgo)
      .order('focus_date', { ascending: false })
      .returns<FocRow[]>(),
  ])

  const input: CoachingInput = {
    memories:    memoriesRes.data    ?? [],
    reflections: reflectionsRes.data ?? [],
    focusItems:  focusRes.data       ?? [],
  }

  let report: CoachingReport
  try {
    report = await generateCoachingReport(input)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Generation failed.' }
  }

  // Keep only the latest report per user
  await supabase.from('futureself_coaching_reports').delete().eq('user_id', user.id)

  const { error: insertErr } = await supabase
    .from('futureself_coaching_reports')
    .insert({ user_id: user.id, report_json: report })

  if (insertErr) console.error('[coaching] insert:', insertErr.message)

  revalidatePath('/coaching')
  revalidatePath('/dashboard')

  return { success: true, data: report }
}
