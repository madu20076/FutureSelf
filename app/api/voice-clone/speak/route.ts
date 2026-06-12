import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { saveVoiceAudio, truncateForTTS } from '@/lib/futureself/voice'

export const dynamic = 'force-dynamic'

const ELEVEN_MODEL = 'eleven_turbo_v2'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const elevenKey   = process.env.ELEVENLABS_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Storage not configured.' }, { status: 503 })
  }
  if (!elevenKey) {
    return Response.json({ error: 'Voice cloning not configured.' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return Response.json({ error: 'Not authenticated.' }, { status: 401 })

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated.' }, { status: 401 })

  let body: { text?: string; messageId?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const text = (body.text ?? '').trim()
  if (!text) return Response.json({ error: 'text is required.' }, { status: 400 })

  // Find the user's ready clone
  type SampleRow = { id: string; clone_voice_id: string }
  const { data: sample } = await supabase
    .from('voice_samples')
    .select('id, clone_voice_id')
    .eq('user_id', user.id)
    .eq('clone_status', 'ready')
    .not('clone_voice_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SampleRow>()

  if (!sample?.clone_voice_id) {
    return Response.json({ error: 'No ready voice clone found for this user.' }, { status: 404 })
  }

  const truncated = truncateForTTS(text)

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${sample.clone_voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key':   elevenKey,
          'Content-Type': 'application/json',
          Accept:         'audio/mpeg',
        },
        body: JSON.stringify({
          text:           truncated,
          model_id:       ELEVEN_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`ElevenLabs TTS ${res.status}: ${errText}`)
    }

    const bytes = new Uint8Array(await res.arrayBuffer())
    const audioUrl = await saveVoiceAudio(
      { userId: user.id, messageId: body.messageId, audioBytes: bytes, textUsed: truncated },
      supabase
    )

    return Response.json({ audioUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cloned voice generation failed.'
    console.error('[voice-clone/speak]', msg)
    return Response.json({ error: msg }, { status: 502 })
  }
}
