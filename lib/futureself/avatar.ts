import type { Plan } from './subscription'

export type AvatarProvider = 'did'

export type AvatarStatus = 'not_configured' | 'pending' | 'ready' | 'error'

// Shape that maps directly to the D-ID Talks API body.
// When D-ID integration is added, pass this to POST /api/avatar/generate.
export type AvatarRequest = {
  provider:   AvatarProvider
  // source_url in D-ID terms — the portrait image URL
  sourceUrl:  string
  // D-ID script.input — text the avatar will speak
  scriptText: string
  // D-ID script.provider.voice_id — optional TTS voice
  voiceId?:   string
}

// D-ID API response shape (for future type-safe integration)
export type AvatarResult = {
  id:         string   // D-ID talk ID, used to poll for status
  status:     'created' | 'done' | 'error' | 'started'
  result_url?: string  // signed video URL when status === 'done'
}

export function canUseTalkingAvatar(plan: Plan): boolean {
  return plan === 'premium'
}

export function getAvatarProvider(): AvatarProvider {
  // AVATAR_PROVIDER env var is server-side only (no NEXT_PUBLIC_ prefix)
  const env = process.env.AVATAR_PROVIDER
  if (env === 'did') return 'did'
  return 'did' // single supported provider; extend here when adding HeyGen etc.
}

export function buildAvatarRequest(params: {
  sourceImageUrl: string
  scriptText:     string
  voiceId?:       string
}): AvatarRequest {
  return {
    provider:   getAvatarProvider(),
    sourceUrl:  params.sourceImageUrl,
    scriptText: params.scriptText,
    voiceId:    params.voiceId,
  }
}

// Where D-ID plugs in:
// 1. Create app/api/avatar/generate/route.ts
//    - Auth check
//    - Call buildAvatarRequest() with the user's portrait URL + chat response text
//    - POST to https://api.d-id.com/talks with DID_API_KEY
//    - Return talk ID to client
// 2. Create app/api/avatar/status/[id]/route.ts
//    - Poll GET https://api.d-id.com/talks/{id}
//    - Return result_url when done
// 3. In conversation-view.tsx:
//    - On assistant response, call /api/avatar/generate
//    - Poll /api/avatar/status until done
//    - Play result_url in a <video> element over the portrait
