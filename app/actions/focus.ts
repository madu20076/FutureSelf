'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateDailyFocus } from '@/lib/futureself/focus'

export type FocusRow = {
  id: string
  focus_text: string
  completed: boolean
  focus_date: string
  created_at: string
}

type Result<T = void> = { success: boolean; data?: T; error?: string }

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

export async function generateFocusAction(): Promise<Result<FocusRow[]>> {
  const auth = await getAuthedSupabase()
  if (!auth) return { success: false, error: 'Not authenticated.' }
  const { supabase, user } = auth

  // Fetch memories to inform focus generation
  type MemRow = { content: string; memory_type: string; importance: number }
  const { data: memories } = await supabase
    .from('futureself_memories')
    .select('content, memory_type, importance')
    .eq('user_id', user.id)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60)
    .returns<MemRow[]>()

  const all = memories ?? []
  const byType = (types: string[]) => all.filter(m => types.includes(m.memory_type))

  let focusItems: string[]
  try {
    focusItems = await generateDailyFocus({
      goals:      byType(['goal']),
      projects:   byType(['project']),
      challenges: byType(['challenge']),
      wins:       byType(['win']),
      memories:   byType(['preference', 'belief', 'lesson', 'decision', 'personal_fact', 'communication_style']),
    })
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'AI generation failed.' }
  }

  // Replace today's items
  const today = new Date().toISOString().slice(0, 10)

  await supabase
    .from('futureself_focus')
    .delete()
    .eq('user_id', user.id)
    .eq('focus_date', today)

  const { data, error } = await supabase
    .from('futureself_focus')
    .insert(focusItems.map(text => ({
      user_id:    user.id,
      focus_text: text,
      focus_date: today,
      completed:  false,
    })))
    .select('id, focus_text, completed, focus_date, created_at')
    .returns<FocusRow[]>()

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard')
  return { success: true, data: data ?? [] }
}

export async function toggleFocusAction(
  focusId: string,
  completed: boolean
): Promise<Result> {
  const auth = await getAuthedSupabase()
  if (!auth) return { success: false, error: 'Not authenticated.' }
  const { supabase, user } = auth

  const { error } = await supabase
    .from('futureself_focus')
    .update({ completed })
    .eq('id', focusId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
