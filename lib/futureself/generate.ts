import type { OnboardingAnswers } from '@/app/actions/onboarding'

export type ResponseStyle = 'Brief' | 'Balanced' | 'Detailed'

export type GeneratedProfile = {
  display_name: string
  personality_summary: string
  tone: string
  boundaries: string
  response_style: ResponseStyle
}

// ── Response style detection ──────────────────────────────────────────────────

const INTROVERT_KEYWORDS = [
  'introvert', 'introverted',
  'low-key', 'lowkey', 'low key',
  'private', 'independent',
  'anti-social', 'antisocial',
  'quiet', 'reserved', 'shy',
  'keeps to myself', 'to myself',
  'not social', 'not very social',
]

function detectResponseStyle(answers: OnboardingAnswers): ResponseStyle {
  const combined = [
    answers.friendsDescription,
    answers.tone,
    answers.helpUnderstand,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return INTROVERT_KEYWORDS.some((kw) => combined.includes(kw))
    ? 'Brief'
    : 'Balanced'
}

// ── Text utilities ────────────────────────────────────────────────────────────

function fixI(s: string): string {
  // Standalone "i" → "I", and contractions "i'm / i've / i'll / i'd" → "I'm" etc.
  return s.replace(/\bi\b/g, 'I').replace(/\bi'/g, "I'")
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function fixCapitalization(s: string): string {
  // Capitalize the first letter after any sentence-ending punctuation + whitespace
  return s.replace(/([.!?]\s+)([a-z])/g, (_, p, l) => p + l.toUpperCase())
}

function normalize(s: string): string {
  const t = s.trim()
  if (!t) return ''
  let r = fixI(t)
  r = capitalize(r)
  r = fixCapitalization(r)
  if (!/[.!?]$/.test(r)) r += '.'
  return r
}

// Wrap a raw answer in a first-person voice.
//
// Two strategies:
//   • Answers already starting with "I" → normalize and return as-is.
//     This prevents doubled subjects ("At my core: I believe I believe…").
//   • Everything else → colon-separated label ("Label: content.").
//     A colon join is grammatically safe regardless of whether the raw answer
//     is a fragment, a complete sentence, or anything in between.
//     This also eliminates "they/their/them" problem: we never wrap a raw
//     answer into a predicate slot like "shaped by [verb clause]".
function fp(label: string, raw: string): string {
  const t = raw.trim().replace(/^that\s+/i, '') // strip "that I …" → "I …"
  if (!t) return ''
  if (/^I\b|^I'/i.test(t)) return normalize(t)
  const l = label.endsWith(':') ? label : `${label}:`
  return normalize(`${l} ${fixI(t)}`)
}

// friendsDescription variant: for typical "creative and driven"-style fragments
// "I'm [X]" is cleaner than a colon label.
function fpIntro(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^I\b|^I'/i.test(t)) return normalize(t)
  return normalize(`I'm ${fixI(t.charAt(0).toLowerCase() + t.slice(1))}`)
}

// Join non-empty sentences into a single paragraph string.
function para(...parts: (string | false | null | undefined)[]): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' ')
}

// ── Profile generator ─────────────────────────────────────────────────────────
//
// Output format for personality_summary:
//
//   Section Name\nParagraph text.\n\nSection Name\nParagraph text.…
//
// The UI splits on '\n\n' and then on the first '\n' to separate label/content.
// The system prompt in lib/futureself/prompt.ts receives the whole string and
// benefits from the labelled structure.

export function generateFutureSelfProfile(answers: OnboardingAnswers): GeneratedProfile {
  const name = answers.name.trim() || 'FutureSelf'
  const sections: Array<[string, string]> = []

  // ── 1. Personal Introduction ─────────────────────────────────────────────
  const intro = para(
    answers.friendsDescription.trim() && fpIntro(answers.friendsDescription),
    answers.helpUnderstand.trim() &&
      fp('What I most want people to understand about me', answers.helpUnderstand),
  )
  if (intro) sections.push(['Personal Introduction', intro])

  // ── 2. Core Beliefs ──────────────────────────────────────────────────────
  const beliefs = para(
    answers.strongestBeliefs.trim() &&
      fp('At my core', answers.strongestBeliefs),
  )
  if (beliefs) sections.push(['Core Beliefs', beliefs])

  // ── 3. Life Lessons ──────────────────────────────────────────────────────
  const lessons = para(
    answers.lifeShapingLessons.trim() &&
      fp('A defining experience', answers.lifeShapingLessons),
    answers.adviceGiven.trim() &&
      fp('The wisdom I carry most', answers.adviceGiven),
  )
  if (lessons) sections.push(['Life Lessons', lessons])

  // ── 4. Goals & Ambitions ─────────────────────────────────────────────────
  const goals = para(
    answers.biggestGoals.trim() &&
      fp("What I'm working toward", answers.biggestGoals),
  )
  if (goals) sections.push(['Goals & Ambitions', goals])

  // ── 5. Legacy ────────────────────────────────────────────────────────────
  const legacy = para(
    answers.rememberFor.trim() &&
      fp('What I hope to be remembered for', answers.rememberFor),
  )
  if (legacy) sections.push(['Legacy', legacy])

  const summary =
    sections.map(([label, content]) => `${label}\n${content}`).join('\n\n') ||
    "Personal Introduction\nI'm building my FutureSelf."

  return {
    display_name: name,
    personality_summary: summary,
    tone: answers.tone.trim(),
    boundaries: answers.avoidTopics.trim(),
    response_style: detectResponseStyle(answers),
  }
}
