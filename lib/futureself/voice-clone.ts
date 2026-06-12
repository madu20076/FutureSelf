// Provider-ready stub for future voice cloning.
// Current conversation playback uses preset OpenAI TTS voices (see voice.ts).
// When a cloning provider is ready, set VOICE_CLONE_PROVIDER=elevenlabs and
// implement the marked sections in the API routes below.

import type { Plan } from './subscription'

export type CloneProvider = 'elevenlabs' | 'cartesia' | 'openai'

export type VoiceCloneResult = {
  voiceId:  string
  provider: CloneProvider
}

export type ClonedAudioResult = {
  bytes:            Uint8Array
  durationSeconds?: number
}

// ── Request shapes ────────────────────────────────────────────────────────────

// Shape passed to POST /api/voice-clone/create (Phase 18+)
export type VoiceCloneRequest = {
  provider:  CloneProvider
  sampleUrl: string          // publicly accessible URL of the recorded sample
  name:      string          // display label for the clone in the provider dashboard
}

// Shape passed to POST /api/voice-clone/speak (Phase 18+)
export type ClonedSpeechRequest = {
  provider:     CloneProvider
  cloneVoiceId: string  // ID returned by VoiceCloneResult.voiceId
  text:         string
}

// ── Gate ─────────────────────────────────────────────────────────────────────

export function canUseVoiceCloning(plan: Plan): boolean {
  return plan === 'premium'
}

// ── Provider helpers ──────────────────────────────────────────────────────────

// Returns the configured provider, or null if cloning is not yet enabled.
export function getVoiceCloneProvider(): CloneProvider | null {
  const raw = process.env.VOICE_CLONE_PROVIDER?.toLowerCase()
  if (raw === 'elevenlabs' || raw === 'cartesia' || raw === 'openai') return raw
  return null
}

// Build a request object for uploading a sample to the cloning provider.
// Pass the returned object to POST /api/voice-clone/create when ready.
export function buildVoiceCloneRequest(sampleUrl: string): VoiceCloneRequest {
  return {
    provider:  (getVoiceCloneProvider() ?? 'elevenlabs') as CloneProvider,
    sampleUrl,
    name:      'FutureSelf Voice',
  }
}

// Build a request object for synthesizing text with a previously cloned voice.
// Pass the returned object to POST /api/voice-clone/speak when ready.
export function buildClonedSpeechRequest(
  text:         string,
  cloneVoiceId: string
): ClonedSpeechRequest {
  return {
    provider:     (getVoiceCloneProvider() ?? 'elevenlabs') as CloneProvider,
    cloneVoiceId,
    text,
  }
}

// ── Future implementation stubs ───────────────────────────────────────────────

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
  _text:     string,
  _voiceId:  string,
  _provider?: CloneProvider
): Promise<ClonedAudioResult> {
  throw new Error(
    'Voice cloning is not yet available. Set VOICE_CLONE_PROVIDER to enable.'
  )
}

// Where ElevenLabs plugs in (Phase 18+):
// 1. Create app/api/voice-clone/create/route.ts
//    - Auth check
//    - Call buildVoiceCloneRequest(sampleUrl)
//    - POST to https://api.elevenlabs.io/v1/voices/add with ELEVENLABS_API_KEY
//      Body: { name, files: [audioBlob] }
//    - Store returned voice_id in voice_samples.clone_voice_id,
//      set clone_status='ready', clone_provider='elevenlabs'
// 2. Create app/api/voice-clone/speak/route.ts
//    - Auth check, verify clone_status==='ready'
//    - Call buildClonedSpeechRequest(text, cloneVoiceId)
//    - POST to https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
//    - Stream audio bytes back to client
// 3. In conversation-view.tsx / api/voice/route.ts:
//    - Check if user has clone_status==='ready'
//    - If yes, route through /api/voice-clone/speak instead of OpenAI TTS
