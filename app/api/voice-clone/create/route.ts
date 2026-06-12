import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const elevenKey   = process.env.ELEVENLABS_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Storage not configured.' }, { status: 503 })
  }
  if (!elevenKey) {
    return Response.json(
      { error: 'Voice cloning is not yet configured. Set ELEVENLABS_API_KEY to enable.' },
      { status: 503 }
    )
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

  // Find the latest voice sample
  type SampleRow = { id: string; audio_url: string }
  const { data: sample, error: sampleErr } = await supabase
    .from('voice_samples')
    .select('id, audio_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SampleRow>()

  if (sampleErr || !sample) {
    return Response.json(
      { error: 'No voice sample found. Record a voice sample in Voice Settings first.' },
      { status: 404 }
    )
  }

  // Mark as processing
  await supabase
    .from('voice_samples')
    .update({ clone_status: 'processing', clone_provider: 'elevenlabs' })
    .eq('id', sample.id)

  // Download the audio sample
  let audioBytes: ArrayBuffer
  try {
    const audioRes = await fetch(sample.audio_url)
    if (!audioRes.ok) throw new Error(`Download failed with status ${audioRes.status}`)
    audioBytes = await audioRes.arrayBuffer()
  } catch (err) {
    await supabase.from('voice_samples').update({ clone_status: 'error' }).eq('id', sample.id)
    const msg = err instanceof Error ? err.message : 'Failed to download audio sample.'
    return Response.json({ error: msg }, { status: 502 })
  }

  // Guess MIME type from URL extension
  const ext = sample.audio_url.split('?')[0].split('.').pop()?.toLowerCase() ?? 'webm'
  const MIME: Record<string, string> = {
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
    webm: 'audio/webm', ogg: 'audio/ogg',
  }
  const mimeType = MIME[ext] ?? 'audio/webm'

  // Build multipart form for ElevenLabs /v1/voices/add
  const form = new FormData()
  form.append('name', 'FutureSelf Voice')
  form.append('files', new Blob([audioBytes], { type: mimeType }), `sample.${ext}`)

  let voiceId: string
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': elevenKey },
      body: form,
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`ElevenLabs error ${res.status}: ${errText}`)
    }
    const json = (await res.json()) as { voice_id?: string }
    if (!json.voice_id) throw new Error('ElevenLabs returned no voice_id.')
    voiceId = json.voice_id
  } catch (err) {
    await supabase.from('voice_samples').update({ clone_status: 'error' }).eq('id', sample.id)
    const msg = err instanceof Error ? err.message : 'Voice cloning failed.'
    console.error('[voice-clone/create]', msg)
    return Response.json({ error: msg }, { status: 502 })
  }

  // Save clone_voice_id and mark ready
  await supabase
    .from('voice_samples')
    .update({
      clone_voice_id: voiceId,
      clone_status:   'ready',
      clone_provider: 'elevenlabs',
    })
    .eq('id', sample.id)

  return Response.json({ voiceId, status: 'ready' })
}
