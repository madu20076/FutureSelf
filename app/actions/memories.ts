'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

export async function saveMemoryAction(input: {
  content: string
  memory_type: string
  source?: string
}): Promise<Result> {
  const auth = await getAuthedSupabase()
  if (!auth) return { success: false, error: 'Not authenticated.' }
  const { supabase, user } = auth

  const { error } = await supabase.from('futureself_memories').insert({
    user_id: user.id,
    memory_type: input.memory_type,
    content: input.content.trim(),
    source: input.source ?? 'manual',
    importance: 3,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/memories')
  revalidatePath('/me')
  return { success: true }
}

export async function editMemoryAction(
  memoryId: string,
  content: string,
  memory_type: string
): Promise<Result> {
  const auth = await getAuthedSupabase()
  if (!auth) return { success: false, error: 'Not authenticated.' }
  const { supabase, user } = auth

  const { error } = await supabase
    .from('futureself_memories')
    .update({ content: content.trim(), memory_type })
    .eq('id', memoryId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/memories')
  return { success: true }
}

export async function deleteMemoryAction(memoryId: string): Promise<Result> {
  const auth = await getAuthedSupabase()
  if (!auth) return { success: false, error: 'Not authenticated.' }
  const { supabase, user } = auth

  const { error } = await supabase
    .from('futureself_memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/memories')
  revalidatePath('/me')
  return { success: true }
}
