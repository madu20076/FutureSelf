import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { generateVoiceAudio, saveVoiceAudio } from '@/lib/futureself/voice'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return Response.json({ error: 'Storage not configured.' }, { status: 503 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'Voice not configured.' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return Response.json({ error: 'Not authenticated.' }, { status: 401 })

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated.' }, { status: 401 })

  let body: { text?: string; messageId?: string; voiceStyle?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const text = (body.text ?? '').trim()
  if (!text) return Response.json({ error: 'text is required.' }, { status: 400 })

  const voiceStyle = body.voiceStyle ?? 'calm'
  const messageId = body.messageId

  try {
    const { bytes, truncated } = await generateVoiceAudio(text, voiceStyle)
    const audioUrl = await saveVoiceAudio(
      { userId: user.id, messageId, audioBytes: bytes, textUsed: truncated },
      supabase
    )
    return Response.json({ audioUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Voice generation failed.'
    console.error('[/api/voice]', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
