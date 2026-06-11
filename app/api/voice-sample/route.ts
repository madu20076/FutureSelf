import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg',
])
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
    'audio/wav': 'wav', 'audio/x-wav': 'wav',
    'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
  }
  return map[mime] ?? 'audio'
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return Response.json({ error: 'Storage not configured.' }, { status: 503 })

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return Response.json({ error: 'Not authenticated.' }, { status: 401 })

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated.' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const file = formData.get('audio') as File | null
  if (!file) return Response.json({ error: 'No audio file provided.' }, { status: 400 })

  const mimeType = file.type || 'audio/webm'
  if (!ALLOWED_TYPES.has(mimeType) && !mimeType.startsWith('audio/')) {
    return Response.json(
      { error: 'Unsupported file type. Use MP3, WAV, M4A, or WebM.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'File must be under 20 MB.' }, { status: 400 })
  }

  const durationRaw = formData.get('duration')
  const durationSeconds = durationRaw ? parseInt(String(durationRaw), 10) : null

  const ext = extFromMime(mimeType)
  const filename = `${user.id}/samples/${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('futureself-voice')
    .upload(filename, bytes, { contentType: mimeType, upsert: false })

  if (uploadError) {
    return Response.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('futureself-voice').getPublicUrl(filename)
  const audioUrl = urlData.publicUrl

  const { data: record, error: dbError } = await supabase
    .from('voice_samples')
    .insert({
      user_id: user.id,
      audio_url: audioUrl,
      duration_seconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      file_type: mimeType,
    })
    .select('id')
    .single<{ id: string }>()

  if (dbError) {
    console.error('[voice-sample] db insert error:', dbError.message)
  }

  return Response.json({ audioUrl, sampleId: record?.id ?? null })
}
