import Anthropic from '@anthropic-ai/sdk'

type MemoryItem = {
  content: string
  importance: number
}

export type FocusInput = {
  goals:      MemoryItem[]
  projects:   MemoryItem[]
  challenges: MemoryItem[]
  wins:       MemoryItem[]
  memories:   MemoryItem[]
}

function buildContext(input: FocusInput): string {
  const lines: string[] = []

  if (input.goals.length > 0) {
    lines.push('GOALS:')
    input.goals.slice(0, 5).forEach(g => lines.push(`- ${g.content}`))
  }
  if (input.projects.length > 0) {
    lines.push('ACTIVE PROJECTS:')
    input.projects.slice(0, 5).forEach(p => lines.push(`- ${p.content}`))
  }
  if (input.challenges.length > 0) {
    lines.push('CURRENT CHALLENGES:')
    input.challenges.slice(0, 5).forEach(c => lines.push(`- ${c.content}`))
  }
  if (input.wins.length > 0) {
    lines.push('RECENT WINS:')
    input.wins.slice(0, 3).forEach(w => lines.push(`- ${w.content}`))
  }
  if (input.memories.length > 0) {
    lines.push('OTHER CONTEXT:')
    input.memories.slice(0, 5).forEach(m => lines.push(`- ${m.content}`))
  }

  return lines.join('\n')
}

function parseFocusItems(text: string): string[] | null {
  // Try JSON array first
  const jsonMatch = text.match(/\[[\s\S]*?\]/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed) && parsed.length >= 2 && parsed.every(s => typeof s === 'string')) {
        return parsed.slice(0, 5)
      }
    } catch {
      // fall through
    }
  }
  // Try line-by-line extraction
  const items = text
    .split('\n')
    .map(l => l.replace(/^[\d.)\-*•"'\s]+/, '').replace(/[",]$/, '').trim())
    .filter(l => l.length >= 5 && l.length <= 100)
  if (items.length >= 2) return items.slice(0, 5)
  return null
}

function fallbackFocus(input: FocusInput): string[] {
  const items: string[] = []
  if (input.goals[0])      items.push(`Make progress on: ${input.goals[0].content.slice(0, 55)}`)
  if (input.projects[0])   items.push(`Advance: ${input.projects[0].content.slice(0, 60)}`)
  if (input.challenges[0]) items.push(`Work through: ${input.challenges[0].content.slice(0, 55)}`)
  if (items.length === 0) {
    return ['Set your first goal for today', 'Reflect on what matters most right now', 'Take one small step forward']
  }
  if (items.length < 3) items.push('Reflect on your progress today')
  return items.slice(0, 5)
}

export async function generateDailyFocus(input: FocusInput): Promise<string[]> {
  const context = buildContext(input)

  if (!context.trim()) return fallbackFocus(input)

  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are helping someone plan their day. Based on their goals, projects, and context, generate 3-5 specific actionable focus items for today.

Rules:
- Each item is a concrete action (3-8 words), not a vague goal
- Prioritize: high-importance goals, active projects, unresolved challenges
- Sound like a daily to-do, not a mission statement
- Return ONLY a JSON array of strings — no explanation, no markdown

Context:
${context}

Return format: ["action one", "action two", "action three"]`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  return parseFocusItems(text) ?? fallbackFocus(input)
}
