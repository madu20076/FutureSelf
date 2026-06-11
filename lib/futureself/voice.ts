import type { SupabaseClient } from '@supabase/supabase-js'

// Maps FutureSelf voice style names to OpenAI TTS voice IDs
const VOICE_MAP: Record<string, string> = {
  calm:       'nova',     // warm, smooth, measured
  direct:     'onyx',     // authoritative, clear
  warm:       'shimmer',  // bright, expressive
  deep:       'echo',     // resonant, considered
  reflective: 'fable',    // narrative, thoughtful
}

export const VOICE_STYLES = ['calm', 'direct', 'warm', 'deep', 'reflective'] as const
export type VoiceStyle = (typeof VOICE_STYLES)[number]

export const VOICE_STYLE_LABELS: Record<VoiceStyle, string> = {
  calm:       'Calm',
  direct:     'Direct',
  warm:       'Warm',
  deep:       'Deep',
  reflective: 'Reflective',
}

export function getVoiceForStyle(style: string): string {
  return VOICE_MAP[style.toLowerCase()] ?? 'nova'
}

const MAX_TTS_CHARS = 800

export function truncateForTTS(text: string): string {
  if (text.length <= MAX_TTS_CHARS) return text
  const slice = text.slice(0, MAX_TTS_CHARS)
  const lastEnd = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?')
  )
  if (lastEnd > 0) return slice.slice(0, lastEnd + 1).trim()
  return slice.trim()
}

export async function generateVoiceAudio(
  text: string,
  voiceStyle: string
): Promise<{ bytes: Uint8Array; truncated: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.')

  const voice = getVoiceForStyle(voiceStyle)
  const truncated = truncateForTTS(text)

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'tts-1', input: truncated, voice }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[Voice] TTS error:', err)
    throw new Error(`TTS generation failed: ${err}`)
  }

  const bytes = new Uint8Array(await res.arrayBuffer())
  return { bytes, truncated }
}

export async function saveVoiceAudio(
  params: {
    userId: string
    messageId?: string
    audioBytes: Uint8Array
    textUsed: string
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<string> {
  const { userId, messageId, audioBytes, textUsed } = params
  const filename = `${userId}/${Date.now()}.mp3`

  const { error: uploadError } = await supabase.storage
    .from('futureself-voice')
    .upload(filename, audioBytes, { contentType: 'audio/mpeg', upsert: false })

  if (uploadError) throw new Error(`Audio upload failed: ${uploadError.message}`)

  const { data: urlData } = supabase.storage.from('futureself-voice').getPublicUrl(filename)
  const audioUrl = urlData.publicUrl

  await supabase.from('voice_generations').insert({
    user_id: userId,
    chat_message_id: messageId ?? null,
    audio_url: audioUrl,
    text_used: textUsed.slice(0, 1000),
  })

  return audioUrl
}
