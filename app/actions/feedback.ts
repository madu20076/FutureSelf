'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { logError } from '@/lib/logger'

type FeedbackPayload = {
  rating:   number
  category: string
  feedback: string
}

type Result = { success: boolean; error?: string }

export async function submitFeedbackAction(data: FeedbackPayload): Promise<Result> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { success: false, error: 'Not configured.' }

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return { success: false, error: 'Not authenticated.' }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('futureself_feedback')
    .insert({
      user_id:  user.id,
      rating:   data.rating   || null,
      category: data.category || null,
      feedback: data.feedback.trim(),
    })

  if (error) {
    logError('feedback/submit', error, user.id)
    return { success: false, error: 'Failed to save feedback.' }
  }

  return { success: true }
}
