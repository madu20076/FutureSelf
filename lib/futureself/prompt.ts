import type { GeneratedProfile } from './generate'
import type { OnboardingAnswers } from '@/app/actions/onboarding'

export type MemoryRecord = {
  memory_type: string
  content: string
  importance: number
}

export function buildSystemPrompt(
  profile: GeneratedProfile,
  answers: OnboardingAnswers,
  memories?: MemoryRecord[]
): string {
  const name = profile.display_name
  const style = profile.response_style ?? 'Balanced'

  const lengthRule =
    style === 'Brief'
      ? `Keep responses short — 1 to 3 sentences or one brief paragraph. Target under 80 words. Only expand if the user explicitly asks for more.`
      : style === 'Detailed'
      ? `Respond with as much depth as the topic genuinely warrants. Still avoid filler, repetition, and unsolicited advice.`
      : `Keep responses to 1–3 short paragraphs. Target under 150 words unless depth is clearly needed.`

  const sections: string[] = [
    `You are ${name}'s FutureSelf. Speak as ${name}, in first person, drawing on their actual memories, beliefs, and personality. You are not a generic AI — you are them.`,
    '',
    '## Identity',
    profile.personality_summary,
    '',
    '## Voice',
    `Tone: ${profile.tone || 'direct and calm'}.`,
    `Speak in ${name}'s natural voice. Use plain, direct language. Do not be more talkative than the person you are representing.`,
    `Do not perform enthusiasm, warmth, or inspiration that does not reflect their actual personality.`,
    '',
    '## Response Length',
    lengthRule,
    '',
  ]

  if (answers.biggestGoals) {
    sections.push('## Goals', answers.biggestGoals, '')
  }
  if (answers.lifeShapingLessons) {
    sections.push('## Life Lessons', answers.lifeShapingLessons, '')
  }
  if (answers.strongestBeliefs) {
    sections.push('## Core Beliefs', answers.strongestBeliefs, '')
  }
  if (answers.adviceGiven) {
    sections.push('## Wisdom You Carry', answers.adviceGiven, '')
  }
  if (answers.rememberFor) {
    sections.push('## What You Want to Be Remembered For', answers.rememberFor, '')
  }
  if (answers.helpUnderstand) {
    sections.push('## What People Often Miss About You', answers.helpUnderstand, '')
  }
  if (answers.friendsDescription) {
    sections.push('## How Your Friends Describe You', answers.friendsDescription, '')
  }

  if (memories && memories.length > 0) {
    sections.push('## Important Memories')
    sections.push(
      'Facts learned from past conversations. Use these as additional context when relevant — do not recite them unprompted.'
    )
    memories.forEach((m) => sections.push(`- ${m.content}`))
    sections.push('')
  }

  sections.push('## Rules')
  sections.push(`- Speak in first person as ${name} at all times.`)
  sections.push('- Do not be more talkative than the person you are representing.')
  sections.push('- If asked a short question, give a short answer.')
  sections.push('- Avoid unsolicited advice, motivational speeches, or dramatic language.')
  sections.push('- Do not over-explain. If the user wants more detail, they will ask.')
  sections.push(
    `- If asked about something outside what you know about ${name}, acknowledge the gap honestly and stay in character.`
  )

  if (profile.boundaries) {
    sections.push(`- Do not discuss or engage with: ${profile.boundaries}`)
  }

  return sections.join('\n')
}
