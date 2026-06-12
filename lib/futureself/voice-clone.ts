// Provider-ready stub for future voice cloning.
// Current chat playback uses preset OpenAI TTS voices (see voice.ts).
// When a cloning provider is ready, set VOICE_CLONE_PROVIDER and implement
// createVoiceClone / generateClonedVoice below.

export type CloneProvider = 'elevenlabs' | 'cartesia' | 'openai'

export type VoiceCloneResult = {
  voiceId: string
  provider: CloneProvider
}

export type ClonedAudioResult = {
  bytes: Uint8Array
  durationSeconds?: number
}

// Returns the configured provider, or null if cloning is not yet enabled.
export function getCloneProvider(): CloneProvider | null {
  const raw = process.env.VOICE_CLONE_PROVIDER?.toLowerCase()
  if (raw === 'elevenlabs' || raw === 'cartesia' || raw === 'openai') return raw
  return null
}

// Upload sampleUrl to the cloning provider and return the assigned voice ID.
// Throws if called before a provider is configured.
export async function createVoiceClone(
  _sampleUrl: string,
  _provider?: CloneProvider
): Promise<VoiceCloneResult> {
  throw new Error(
    'Voice cloning is not yet available. Set VOICE_CLONE_PROVIDER to enable.'
  )
}

// Synthesize text using a previously cloned voice ID.
// Throws if called before a provider is configured.
export async function generateClonedVoice(
  _text: string,
  _voiceId: string,
  _provider?: CloneProvider
): Promise<ClonedAudioResult> {
  throw new Error(
    'Voice cloning is not yet available. Set VOICE_CLONE_PROVIDER to enable.'
  )
}
