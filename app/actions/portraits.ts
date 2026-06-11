'use server'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { buildPortraitPrompt, type PortraitType } from '@/lib/futureself/portrait-prompt'
import { generatePortrait, savePortrait, type ReferenceImage } from '@/lib/futureself/portrait'
import type { GeneratedProfile } from '@/lib/futureself/generate'
import type { OnboardingAnswers } from '@/app/actions/onboarding'
import type { MemoryRecord } from '@/lib/futureself/prompt'

type GenerateResult =
  | { success: true; data: { id: string; image_url: string; portrait_type: PortraitType } }
  | { success: false; error: string }

type DeleteResult = { success: boolean; error?: string }

// Prepended to every prompt. Likeness takes absolute priority over attractiveness.
const IDENTITY_INSTRUCTION =
  'CRITICAL — faithful likeness is the top priority. ' +
  'This person must be instantly recognizable to their family and friends. ' +
  'Preserve exactly: face shape, eyes, nose, mouth, skin tone, complexion, bone structure, and any distinctive features. ' +
  'Do not smooth, slim, symmetrize, retouch, or beautify the face in any way. ' +
  'Do not make this person more attractive or physically idealized than they appear in the reference photo. ' +
  'If there is any conflict between likeness and attractiveness, always choose likeness. ' +
  'Do not replace this person with a different person. '

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAuthedClient(): Promise<SupabaseClient<any> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return null

  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Returns the bytes + content type of the most recently uploaded reference photo,
// or null if no reference photos have been uploaded yet.
async function loadMostRecentReferencePhoto(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<ReferenceImage | null> {
  const prefix = `${userId}/input`

  const { data: files, error } = await supabase.storage
    .from('future-portraits')
    .list(prefix, { limit: 20, sortBy: { column: 'name', order: 'desc' } })

  if (error || !files || files.length === 0) return null

  // Files are named {timestamp}-{originalName}. Descending name sort → most recent first.
  const mostRecent = files[0]

  const { data: blob, error: downloadError } = await supabase.storage
    .from('future-portraits')
    .download(`${prefix}/${mostRecent.name}`)

  if (downloadError || !blob) return null

  const bytes = new Uint8Array(await blob.arrayBuffer())
  const type = blob.type || 'image/jpeg'
  return { bytes, type }
}

type ProfileRow = {
  id: string
  display_name: string | null
  personality_summary: string | null
  tone: string | null
  boundaries: string | null
  onboarding: OnboardingAnswers | null
  response_style: string | null
}

export async function generatePortraitAction(portraitType: PortraitType): Promise<GenerateResult> {
  const supabase = await getAuthedClient()
  if (!supabase) return { success: false, error: 'Not authenticated.' }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return { success: false, error: 'Not authenticated.' }

  // Require a reference photo before generating
  const referenceImage = await loadMostRecentReferencePhoto(user.id, supabase)
  if (!referenceImage) {
    return {
      success: false,
      error: 'Upload a reference photo first to generate a portrait that looks like you.',
    }
  }

  const { data: profileRow } = await supabase
    .from('futureself_profiles')
    .select('id, display_name, personality_summary, tone, boundaries, onboarding, response_style')
    .eq('user_id', user.id)
    .single<ProfileRow>()

  if (!profileRow?.onboarding) {
    return { success: false, error: 'Complete onboarding before generating portraits.' }
  }

  const profile: GeneratedProfile = {
    display_name: profileRow.display_name ?? profileRow.onboarding.name,
    personality_summary: profileRow.personality_summary ?? '',
    tone: profileRow.tone ?? profileRow.onboarding.tone,
    boundaries: profileRow.boundaries ?? profileRow.onboarding.avoidTopics,
    response_style:
      (profileRow.response_style as GeneratedProfile['response_style']) ?? 'Balanced',
  }

  const { data: memoriesData } = await supabase
    .from('futureself_memories')
    .select('memory_type, content, importance')
    .eq('user_id', user.id)
    .in('memory_type', ['goal', 'belief'])
    .order('importance', { ascending: false })
    .limit(5)
    .returns<MemoryRecord[]>()

  const basePrompt = buildPortraitPrompt(
    portraitType,
    profile,
    profileRow.onboarding,
    memoriesData ?? []
  )

  // Prepend identity instruction so the provider keeps the person's likeness
  const prompt = IDENTITY_INSTRUCTION + basePrompt

  try {
    const imageBytes = await generatePortrait(prompt, referenceImage)
    const portrait = await savePortrait(
      {
        userId: user.id,
        profileId: profileRow.id,
        portraitType,
        imageBytes,
        promptUsed: prompt,
      },
      supabase
    )

    revalidatePath('/me')
    revalidatePath('/portraits')

    return {
      success: true,
      data: {
        id: portrait.id,
        image_url: portrait.image_url,
        portrait_type: portrait.portrait_type,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portrait generation failed.'
    return { success: false, error: message }
  }
}

export async function deletePortraitAction(portraitId: string): Promise<DeleteResult> {
  const supabase = await getAuthedClient()
  if (!supabase) return { success: false, error: 'Not authenticated.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: portrait } = await supabase
    .from('future_portraits')
    .select('image_url')
    .eq('id', portraitId)
    .eq('user_id', user.id)
    .single<{ image_url: string }>()

  if (!portrait) return { success: false, error: 'Portrait not found.' }

  const { error } = await supabase
    .from('future_portraits')
    .delete()
    .eq('id', portraitId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  // Best-effort storage cleanup
  try {
    const parsed = new URL(portrait.image_url)
    const marker = '/future-portraits/'
    const idx = parsed.pathname.indexOf(marker)
    if (idx !== -1) {
      const storagePath = parsed.pathname.slice(idx + marker.length)
      await supabase.storage.from('future-portraits').remove([storagePath])
    }
  } catch {
    // ignore storage cleanup errors
  }

  revalidatePath('/me')
  revalidatePath('/portraits')
  return { success: true }
}
