import Anthropic from '@anthropic-ai/sdk'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CoachingReport = {
  biggestOpportunity: string   // A — one concrete sentence
  biggestRisk:        string   // B — one concrete sentence
  momentumScore:      number   // C — 1-10
  momentumLabel:      string   // Surging | Building | Steady | Stalled | Drifting
  recommendedFocus:   string   // D — 1-2 sentences
  futureSelfAdvice:   string   // E — 2-3 sentences, second person
  summary:            string   // 1-2 line widget summary
  generatedAt:        string   // ISO timestamp
}

export type CoachingInput = {
  memories:    { memory_type: string; content: string; importance: number }[]
  reflections: { content: string; created_at: string }[]
  focusItems:  { focus_text: string; completed: boolean }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelForScore(score: number): string {
  if (score >= 9) return 'Surging'
  if (score >= 7) return 'Building'
  if (score >= 5) return 'Steady'
  if (score >= 3) return 'Stalled'
  return 'Drifting'
}

function buildContext(input: CoachingInput): string {
  const lines: string[] = []

  const byType = (type: string) =>
    input.memories.filter(m => m.memory_type === type)

  const goals      = byType('goal')
  const projects   = byType('project')
  const challenges = byType('challenge')
  const wins       = byType('win')
  const other      = input.memories.filter(m =>
    !['goal', 'project', 'challenge', 'win'].includes(m.memory_type)
  )

  if (goals.length)      { lines.push('GOALS:');            goals.slice(0,6).forEach(m => lines.push(`- [imp:${m.importance}] ${m.content}`)) }
  if (projects.length)   { lines.push('ACTIVE PROJECTS:');  projects.slice(0,5).forEach(m => lines.push(`- [imp:${m.importance}] ${m.content}`)) }
  if (challenges.length) { lines.push('CHALLENGES:');       challenges.slice(0,5).forEach(m => lines.push(`- [imp:${m.importance}] ${m.content}`)) }
  if (wins.length)       { lines.push('RECENT WINS:');      wins.slice(0,4).forEach(m => lines.push(`- ${m.content}`)) }
  if (other.length)      { lines.push('OTHER CONTEXT:');    other.slice(0,4).forEach(m => lines.push(`- ${m.content}`)) }

  if (input.reflections.length) {
    lines.push('RECENT WEEKLY REFLECTIONS:')
    input.reflections.slice(0, 6).forEach(r => lines.push(`- ${r.content}`))
  }

  if (input.focusItems.length) {
    const done  = input.focusItems.filter(f => f.completed).length
    const total = input.focusItems.length
    lines.push(`RECENT FOCUS ITEMS (${done}/${total} completed this week):`)
    input.focusItems.slice(0, 8).forEach(f =>
      lines.push(`- [${f.completed ? 'done' : 'pending'}] ${f.focus_text}`)
    )
  }

  return lines.join('\n')
}

function parseReport(text: string): CoachingReport | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const p = JSON.parse(jsonMatch[0])
    if (
      typeof p.biggestOpportunity !== 'string' ||
      typeof p.biggestRisk        !== 'string' ||
      typeof p.momentumScore      !== 'number' ||
      typeof p.recommendedFocus   !== 'string' ||
      typeof p.futureSelfAdvice   !== 'string' ||
      typeof p.summary            !== 'string'
    ) return null

    const score = Math.max(1, Math.min(10, Math.round(p.momentumScore)))
    return {
      biggestOpportunity: p.biggestOpportunity,
      biggestRisk:        p.biggestRisk,
      momentumScore:      score,
      momentumLabel:      typeof p.momentumLabel === 'string' ? p.momentumLabel : labelForScore(score),
      recommendedFocus:   p.recommendedFocus,
      futureSelfAdvice:   p.futureSelfAdvice,
      summary:            p.summary,
      generatedAt:        new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function fallbackReport(input: CoachingInput): CoachingReport {
  const topGoal      = input.memories.find(m => m.memory_type === 'goal')
  const topChallenge = input.memories.find(m => m.memory_type === 'challenge')
  const hasWins      = input.memories.some(m => m.memory_type === 'win')
  const score        = hasWins ? 6 : topGoal ? 5 : topChallenge ? 3 : 4

  return {
    biggestOpportunity: topGoal
      ? `Act on your top goal: ${topGoal.content.slice(0, 80)}`
      : 'Define your most important goal and commit to a first step today.',
    biggestRisk: topChallenge
      ? topChallenge.content.slice(0, 100)
      : 'Lack of defined goals — add context so your FutureSelf can coach you effectively.',
    momentumScore:    score,
    momentumLabel:    labelForScore(score),
    recommendedFocus: topGoal
      ? `Focus this week on: ${topGoal.content.slice(0, 70)}.`
      : 'Start by logging your current goals and challenges to unlock a personalized coaching report.',
    futureSelfAdvice: 'You are capable of more than you realize right now. Show up consistently — every small action compounds into real momentum. Trust the process and keep moving.',
    summary:          'Add more context — goals, projects, and reflections — to unlock a deeper coaching report.',
    generatedAt:      new Date().toISOString(),
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateCoachingReport(input: CoachingInput): Promise<CoachingReport> {
  const context = buildContext(input)

  if (!context.trim()) return fallbackReport(input)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallbackReport(input)

  const client = new Anthropic()

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [
      {
        role:    'user',
        content: `You are a personal coaching AI. Analyze this person's current situation and generate a structured coaching report.

${context}

Generate a JSON object with EXACTLY these fields:
{
  "biggestOpportunity": "One specific opportunity they should act on now (1 sentence, concrete)",
  "biggestRisk": "The most significant risk to their progress right now (1 sentence, honest)",
  "momentumScore": 7,
  "momentumLabel": "Building",
  "recommendedFocus": "The single most important thing to focus on this week (1-2 sentences)",
  "futureSelfAdvice": "Direct advice from their future self in second person — encouraging but specific (2-3 sentences)",
  "summary": "A sharp 1-2 sentence summary of their overall momentum and key theme"
}

momentumScore must be an integer 1-10.
momentumLabel must be exactly one of: Surging (9-10), Building (7-8), Steady (5-6), Stalled (3-4), Drifting (1-2).
Respond with ONLY the JSON object. No markdown, no explanation.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  return parseReport(text) ?? fallbackReport(input)
}
