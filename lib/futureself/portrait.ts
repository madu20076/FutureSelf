import type { SupabaseClient } from '@supabase/supabase-js'
import type { PortraitType } from './portrait-prompt'

export type Portrait = {
  id: string
  user_id: string
  futureself_profile_id: string | null
  portrait_type: PortraitType
  image_url: string
  prompt_used: string | null
  created_at: string
}

export type ReferenceImage = {
  bytes: Uint8Array
  type: string
}

// ── Provider interface ────────────────────────────────────────────────────────

interface PortraitProvider {
  generate(prompt: string, referenceImage: ReferenceImage): Promise<Uint8Array>
}

// ── OpenAI gpt-image-1 (edits endpoint) ──────────────────────────────────────

class OpenAIProvider implements PortraitProvider {
  constructor(private apiKey: string) {}

  async generate(prompt: string, referenceImage: ReferenceImage): Promise<Uint8Array> {
    const form = new FormData()
    form.append('model', 'gpt-image-1')
    form.append('prompt', prompt)
    form.append('n', '1')
    form.append('size', '1024x1024')

    // Reference photo is the identity anchor — passed as image[]
    const blob = new Blob([referenceImage.bytes.buffer as ArrayBuffer], {
      type: referenceImage.type,
    })
    form.append('image[]', blob, 'reference.png')

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        // Do NOT set Content-Type — fetch sets it with the multipart boundary
      },
      body: form,
    })

    const text = await res.text()

    if (!res.ok) {
      console.error('[OpenAI] image edit error:', text)
      throw new Error(`OpenAI image edit failed: ${text}`)
    }

    const json = JSON.parse(text) as { data: Array<{ b64_json: string }> }
    console.log('[OpenAI] image edit success, data length:', json.data?.length)

    const b64 = json.data[0]?.b64_json
    if (!b64) throw new Error('No b64_json in OpenAI edit response.')

    return Uint8Array.from(Buffer.from(b64, 'base64'))
  }
}

// ── Replicate (SDXL) ──────────────────────────────────────────────────────────
// Note: reference image bytes are not directly used here; identity instruction
// is injected into the prompt by the caller instead.

class ReplicateProvider implements PortraitProvider {
  constructor(private apiToken: string) {}

  async generate(prompt: string, _referenceImage: ReferenceImage): Promise<Uint8Array> {
    const createRes = await fetch(
      'https://api.replicate.com/v1/models/stability-ai/sdxl/predictions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
          Prefer: 'wait',
        },
        body: JSON.stringify({
          input: { prompt, width: 1024, height: 1024, num_outputs: 1 },
        }),
      }
    )

    if (!createRes.ok) {
      const text = await createRes.text()
      throw new Error(`Replicate prediction failed: ${text}`)
    }

    type Prediction = { id: string; status: string; output: string[] | null }
    const prediction = (await createRes.json()) as Prediction

    let output = prediction.output
    if (!output && prediction.id) {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const pollRes = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          { headers: { Authorization: `Bearer ${this.apiToken}` } }
        )
        const poll = (await pollRes.json()) as Prediction
        if (poll.status === 'succeeded') {
          output = poll.output
          break
        }
        if (poll.status === 'failed') throw new Error('Replicate prediction failed.')
      }
    }

    const imageUrl = output?.[0]
    if (!imageUrl) throw new Error('No output URL from Replicate.')

    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) throw new Error('Failed to download image from Replicate.')
    return new Uint8Array(await imageRes.arrayBuffer())
  }
}

// ── Provider factory ──────────────────────────────────────────────────────────

function getProvider(): PortraitProvider {
  const provider = (process.env.PORTRAIT_PROVIDER ?? 'openai').toLowerCase()

  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error('OPENAI_API_KEY is required when PORTRAIT_PROVIDER=openai.')
    return new OpenAIProvider(key)
  }

  if (provider === 'replicate') {
    const token = process.env.REPLICATE_API_TOKEN
    if (!token) throw new Error('REPLICATE_API_TOKEN is required when PORTRAIT_PROVIDER=replicate.')
    return new ReplicateProvider(token)
  }

  throw new Error(
    `Unknown PORTRAIT_PROVIDER "${provider}". Supported values: openai, replicate.`
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generatePortrait(
  prompt: string,
  referenceImage: ReferenceImage
): Promise<Uint8Array> {
  return getProvider().generate(prompt, referenceImage)
}

export async function savePortrait(
  params: {
    userId: string
    profileId: string
    portraitType: PortraitType
    imageBytes: Uint8Array
    promptUsed: string
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<Portrait> {
  const { userId, profileId, portraitType, imageBytes, promptUsed } = params

  const filename = `${userId}/${portraitType}-${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from('future-portraits')
    .upload(filename, imageBytes, { contentType: 'image/png', upsert: false })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  const { data: urlData } = supabase.storage.from('future-portraits').getPublicUrl(filename)

  const { data, error } = await supabase
    .from('future_portraits')
    .insert({
      user_id: userId,
      futureself_profile_id: profileId,
      portrait_type: portraitType,
      image_url: urlData.publicUrl,
      prompt_used: promptUsed,
    })
    .select()
    .single<Portrait>()

  if (error) throw new Error(`DB insert failed: ${error.message}`)
  return data
}

export async function getPortraits(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<Portrait[]> {
  const { data } = await supabase
    .from('future_portraits')
    .select('id, user_id, futureself_profile_id, portrait_type, image_url, prompt_used, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<Portrait[]>()

  return data ?? []
}
