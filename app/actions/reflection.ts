'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateCoachingAction } from './coaching'

type Answer = { content: string; memory_type: string }
type Result = { success: boolean; error?: string }

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

export async function saveReflectionAnswers(answers: Answer[]): Promise<Result> {
  const auth = await getAuthedSupabase()
  if (!auth) return { success: false, error: 'Not authenticated.' }
  const { supabase, user } = auth

  const rows = answers
    .filter(a => a.content.trim().length > 0)
    .map(a => ({
      user_id:     user.id,
      memory_type: a.memory_type,
      content:     a.content.trim(),
      source:      'weekly_reflection',
      importance:  4,
    }))

  if (rows.length === 0) return { success: false, error: 'No answers to save.' }

  const { error } = await supabase.from('futureself_memories').insert(rows)
  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/memories')
  revalidatePath('/me')

  // Regenerate coaching report after reflection — non-fatal if it fails
  try {
    await generateCoachingAction()
  } catch (err) {
    console.error('[reflection] coaching regen failed:', err)
  }

  return { success: true }
}
