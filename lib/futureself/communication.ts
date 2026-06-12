import Anthropic from '@anthropic-ai/sdk'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CommunicationProfile = {
  communicationStyle: string
  decisionStyle:      string
  motivationStyle:    string
  leadershipStyle:    string
  planningStyle:      string
  riskTolerance:      string
  summary:            string
  updatedAt:          string
}

export type CommunicationInput = {
  userMessages:   string[]
  memories:       { memory_type: string; content: string; importance: number }[]
  reflections:    { content: string }[]
  coachingReport: {
    summary:            string
    biggestOpportunity: string
    biggestRisk:        string
    momentumLabel:      string
  } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildContext(input: CommunicationInput): string {
  const lines: string[] = []

  if (input.userMessages.length > 0) {
    lines.push('RECENT USER MESSAGES (from conversations with FutureSelf):')
    input.userMessages.slice(0, 40).forEach(m => lines.push(`- ${m.slice(0, 200)}`))
    lines.push('')
  }

  const goals      = input.memories.filter(m => m.memory_type === 'goal')
  const projects   = input.memories.filter(m => m.memory_type === 'project')
  const challenges = input.memories.filter(m => m.memory_type === 'challenge')
  const wins       = input.memories.filter(m => m.memory_type === 'win')

  if (goals.length)      { lines.push('GOALS:');      goals.slice(0,5).forEach(m => lines.push(`- ${m.content}`)); lines.push('') }
  if (projects.length)   { lines.push('PROJECTS:');   projects.slice(0,5).forEach(m => lines.push(`- ${m.content}`)); lines.push('') }
  if (challenges.length) { lines.push('CHALLENGES:'); challenges.slice(0,4).forEach(m => lines.push(`- ${m.content}`)); lines.push('') }
  if (wins.length)       { lines.push('WINS:');       wins.slice(0,4).forEach(m => lines.push(`- ${m.content}`)); lines.push('') }

  if (input.reflections.length > 0) {
    lines.push('WEEKLY REFLECTIONS:')
    input.reflections.slice(0, 6).forEach(r => lines.push(`- ${r.content}`))
    lines.push('')
  }

  if (input.coachingReport) {
    const r = input.coachingReport
    lines.push('COACHING CONTEXT:')
    lines.push(`Momentum: ${r.momentumLabel}`)
    lines.push(`Summary: ${r.summary}`)
    lines.push(`Opportunity: ${r.biggestOpportunity}`)
    lines.push(`Risk: ${r.biggestRisk}`)
    lines.push('')
  }

  return lines.join('\n')
}

function parseProfile(text: string): CommunicationProfile | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const p = JSON.parse(jsonMatch[0])
    if (
      typeof p.communicationStyle !== 'string' ||
      typeof p.decisionStyle      !== 'string' ||
      typeof p.motivationStyle    !== 'string' ||
      typeof p.leadershipStyle    !== 'string' ||
      typeof p.planningStyle      !== 'string' ||
      typeof p.riskTolerance      !== 'string' ||
      typeof p.summary            !== 'string'
    ) return null

    return {
      communicationStyle: p.communicationStyle,
      decisionStyle:      p.decisionStyle,
      motivationStyle:    p.motivationStyle,
      leadershipStyle:    p.leadershipStyle,
      planningStyle:      p.planningStyle,
      riskTolerance:      p.riskTolerance,
      summary:            p.summary,
      updatedAt:          new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function fallbackProfile(input: CommunicationInput): CommunicationProfile {
  const hasGoals      = input.memories.some(m => m.memory_type === 'goal')
  const hasWins       = input.memories.some(m => m.memory_type === 'win')
  const hasChallenges = input.memories.some(m => m.memory_type === 'challenge')
  const hasContext    = input.memories.length > 3 || input.userMessages.length > 5

  return {
    communicationStyle: hasContext ? 'Direct and purposeful'            : 'Add conversations to analyze',
    decisionStyle:      hasGoals   ? 'Goal-oriented and intentional'    : 'Analytical',
    motivationStyle:    hasWins    ? 'Achievement and progress-driven'  : 'Growth-focused',
    leadershipStyle:    'Autonomous and self-directed',
    planningStyle:      hasGoals   ? 'Strategic with clear objectives'  : 'Adaptive',
    riskTolerance:      hasChallenges ? 'Comfortable with calculated risk' : 'Measured',
    summary: hasContext
      ? 'Based on your context, you appear to be a focused, purposeful communicator who values progress and clear goals.'
      : 'Start more conversations and add memories to generate a detailed communication profile.',
    updatedAt: new Date().toISOString(),
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateCommunicationProfile(
  input: CommunicationInput
): Promise<CommunicationProfile> {
  const context = buildContext(input)
  const hasEnoughData =
    input.userMessages.length >= 3 ||
    input.memories.length >= 5 ||
    input.reflections.length >= 2

  if (!hasEnoughData || !context.trim()) return fallbackProfile(input)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallbackProfile(input)

  const client = new Anthropic()

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [
      {
        role:    'user',
        content: `Analyze this person's communication style, decision-making patterns, and behavioral tendencies based on their conversations, memories, and reflections.

${context}

Generate a JSON object with EXACTLY these fields:
{
  "communicationStyle": "...",  // 3-6 word phrase, e.g. "Direct and action-oriented"
  "decisionStyle": "...",       // 3-6 word phrase, e.g. "Data-driven, systematic thinker"
  "motivationStyle": "...",     // 3-6 word phrase, e.g. "Intrinsic, achievement-focused"
  "leadershipStyle": "...",     // 3-6 word phrase, e.g. "Entrepreneurial, autonomous"
  "planningStyle": "...",       // 3-6 word phrase, e.g. "Strategic with flexible execution"
  "riskTolerance": "...",       // 3-6 word phrase, e.g. "High — embraces experimentation"
  "summary": "..."              // 2-3 sentences synthesizing their communication personality and what it means for how FutureSelf should respond
}

Respond with ONLY the JSON object. No markdown, no explanation.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  return parseProfile(text) ?? fallbackProfile(input)
}
