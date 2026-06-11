import type { GeneratedProfile } from './generate'
import type { OnboardingAnswers } from '@/app/actions/onboarding'
import type { MemoryRecord } from './prompt'

export type PortraitType =
  | 'five_years'
  | 'ten_years'
  | 'entrepreneur'
  | 'family'
  | 'retirement'
  | 'best_self'

export const PORTRAIT_TYPES: PortraitType[] = [
  'five_years',
  'ten_years',
  'best_self',
  'entrepreneur',
  'family',
  'retirement',
]

export const PORTRAIT_TYPE_LABELS: Record<PortraitType, string> = {
  five_years: '5 Years From Now',
  ten_years: '10 Years From Now',
  best_self: 'Most Grounded Me',
  entrepreneur: 'Entrepreneur Me',
  family: 'Family Me',
  retirement: 'Retirement Me',
}

type Descriptor = {
  scene: string
  expression: string
  attire: string
  environment: string
}

const DESCRIPTORS: Record<PortraitType, Descriptor> = {
  five_years: {
    scene:
      'slightly older, visibly more confident and grounded, early signs of meaningful success',
    expression:
      'calm determination, quiet self-assurance, the look of someone who has made real progress',
    attire: 'smart casual, polished but relaxed, elevated everyday wear',
    environment: 'modern purposeful workspace or city environment, clean and well-lit',
  },
  ten_years: {
    scene:
      'noticeably more mature, clear evidence of significant achievement and personal growth',
    expression:
      'deep confidence, wisdom earned through experience, fulfilled and quietly focused',
    attire: 'elevated professional or entrepreneurial style, refined and intentional',
    environment:
      'sophisticated setting reflecting success — spacious, well-designed, distinguished',
  },
  entrepreneur: {
    scene:
      'successful business owner, composed and focused presence',
    expression:
      'quiet confidence, driven intensity, slight smile of someone building something meaningful',
    attire: 'sharp business attire or premium smart casual, clean lines, intentional accessories',
    environment: 'modern office with glass and natural light, city skyline or executive desk visible',
  },
  family: {
    scene: 'warm and deeply connected, surrounded by love and belonging, at peace in domestic life',
    expression: 'genuine warmth, deep happiness, relaxed joy, eyes full of love and contentment',
    attire: 'comfortable casual, warm earthy tones, approachable and real',
    environment:
      'home setting with golden hour light — backyard, living room, or family gathering space',
  },
  retirement: {
    scene: 'noticeably older, deeply peaceful, genuinely fulfilled — a life well and fully lived',
    expression: 'serene contentment, accumulated wisdom, a gentle knowing smile',
    attire: 'comfortable quality clothing, relaxed elegance, unhurried and at ease',
    environment:
      'beautiful natural or serene setting — garden, ocean view, or cozy light-filled home',
  },
  best_self: {
    scene:
      'same person, same age, same face — no facial changes, no aging, no beautification. ' +
      'Better groomed, more rested, improved posture, well-presented. ' +
      'Grounded, calm, emotionally mature, fully present',
    expression:
      'quiet purposeful calm, emotionally settled, focused and present — the look of someone who knows exactly who they are',
    attire: 'clean smart casual or minimalist wear, intentional and well-fitted',
    environment: 'clean natural or minimal space, soft diffused natural light',
  },
}

const BASE_STYLE =
  'photorealistic portrait photograph, natural lighting, sharp focus, high detail, true to life, unretouched, no idealization, no beauty filter'

export function buildPortraitPrompt(
  type: PortraitType,
  profile: GeneratedProfile,
  answers: OnboardingAnswers,
  memories?: MemoryRecord[]
): string {
  const name = profile.display_name
  const d = DESCRIPTORS[type]

  const parts: string[] = [
    `Portrait of ${name} — ${d.scene}.`,
    `Expression: ${d.expression}.`,
    `Attire: ${d.attire}.`,
    `Environment: ${d.environment}.`,
  ]

  // best_self must not alter the face — only grooming, posture, and presentation improve
  if (type === 'best_self') {
    parts.push(
      'Do not age-change or beautify the face. ' +
      'Do not alter facial structure, skin tone, nose, eyes, or mouth. ' +
      'Keep the person at their current recognizable appearance — just more composed, rested, focused, and well-presented.'
    )
  }

  // Goals give contextual weight to achievement-oriented types
  const goals = answers.biggestGoals?.trim()
  if (goals && ['entrepreneur', 'ten_years', 'best_self'].includes(type)) {
    parts.push(`This person has worked toward: ${goals.slice(0, 120)}.`)
  }

  // Personality tone maps to visual expression cues
  const tone = profile.tone?.toLowerCase() ?? ''
  if (tone.includes('warm') || tone.includes('kind')) {
    parts.push('Warm, approachable eyes.')
  } else if (tone.includes('direct') || tone.includes('intense') || tone.includes('honest')) {
    parts.push('Sharp, direct gaze.')
  } else if (tone.includes('calm') || tone.includes('quiet') || tone.includes('peaceful')) {
    parts.push('Composed, still expression.')
  } else if (tone.includes('humour') || tone.includes('funny') || tone.includes('playful')) {
    parts.push('Hint of amusement in the eyes.')
  }

  // High-importance goal/belief memories ground the portrait in real context
  const relevantMemories = memories
    ?.filter((m) => m.memory_type === 'goal' || m.memory_type === 'belief')
    .slice(0, 2)
    .map((m) => m.content)
  if (relevantMemories && relevantMemories.length > 0) {
    parts.push(`Someone who values: ${relevantMemories.join('; ')}.`)
  }

  parts.push(BASE_STYLE)
  return parts.join(' ')
}
