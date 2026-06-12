export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'OpenAI API key not configured.' },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const audio = formData.get('audio')
  if (!audio || !(audio instanceof Blob)) {
    return Response.json({ error: 'No audio file provided.' }, { status: 400 })
  }

  // Derive a filename extension from the MIME type so Whisper can identify the format
  const mimeType = audio.type || 'audio/webm'
  const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'webm'
  const filename = `recording.${ext}`

  const whisperForm = new FormData()
  whisperForm.append('file', audio, filename)
  whisperForm.append('model', 'whisper-1')

  let whisperRes: Response
  try {
    whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    })
  } catch (err) {
    console.error('[Transcribe] network error:', err)
    return Response.json({ error: 'Transcription request failed.' }, { status: 502 })
  }

  if (!whisperRes.ok) {
    const body = await whisperRes.text().catch(() => '')
    console.error('[Transcribe] OpenAI error:', whisperRes.status, body)
    return Response.json({ error: 'Transcription failed.' }, { status: 500 })
  }

  const data = (await whisperRes.json()) as { text?: string }
  const transcript = (data.text ?? '').trim()

  if (!transcript) {
    return Response.json({ error: 'No speech detected.' }, { status: 422 })
  }

  return Response.json({ transcript })
}
