'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

type Result = { success: boolean; error?: string }

export async function deleteMemoryAction(memoryId: string): Promise<Result> {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('futureself_memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/memories')
  return { success: true }
}
