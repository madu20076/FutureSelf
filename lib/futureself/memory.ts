import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Memory = {
  memory_type: string
  content: string
  importance: number
  source: string
}

const VALID_TYPES = [
  'goal', 'preference', 'belief', 'lesson',
  'decision', 'personal_fact', 'communication_style',
  'challenge', 'win', 'relationship', 'project',
] as const

type ValidType = typeof VALID_TYPES[number]

// ── Filters ───────────────────────────────────────────────────────────────────

export function shouldSaveMemory(content: string): boolean {
  if (!content || content.trim().length < 15) return false
  // Reject anything that reads as a greeting/filler/trivial response
  const trivial = /^(hi|hello|hey|thanks|thank you|ok|okay|sure|yes|no|maybe|what|why|how|when|where|who)\b/i
  return !trivial.test(content.trim())
}

export function deduplicateMemories(
  newContent: string,
  existing: Array<{ content: string }>
): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, '').trim()

  const newNorm = norm(newContent)
  const newWords = new Set(newNorm.split(/\s+/).filter(Boolean))

  return !existing.some((m) => {
    const existNorm = norm(m.content)
    const existWords = new Set(existNorm.split(/\s+/).filter(Boolean))
    // Reject if either string contains the other
    if (existNorm.includes(newNorm) || newNorm.includes(existNorm)) return true
    // Reject if >75% word overlap
    const overlap = [...newWords].filter((w) => existWords.has(w)).length
    return overlap / newWords.size > 0.75
  })
}

// ── Extraction ────────────────────────────────────────────────────────────────

export async function extractMemoriesFromConversation(
  userMessage: string,
  assistantResponse: string,
  existingMemories: Array<{ content: string }> = []
): Promise<Memory[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return []

  const existingSection =
    existingMemories.length > 0
      ? `\n\nAlready saved (do not duplicate):\n${existingMemories
          .slice(0, 20)
          .map((m) => `- ${m.content}`)
          .join('\n')}`
      : ''

  const prompt = `Analyze this conversation exchange and extract 0-3 useful long-term memories about the USER.

User: "${userMessage.slice(0, 500)}"
Assistant: "${assistantResponse.slice(0, 800)}"${existingSection}

Rules:
- Only extract facts about the USER, not the assistant
- Good: goals, values, preferences, beliefs, decisions, personal facts, communication style
- Skip: greetings, small talk, one-off comments, vague statements, anything already saved above

Return a JSON array. Each item: {"memory_type":"goal|challenge|win|project|relationship|preference|belief|lesson|decision|personal_fact|communication_style","content":"concise third-person fact","importance":1-5}
If nothing is worth saving, return: []`

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text =
      response.content[0].type === 'text'
        ? response.content[0].text.trim()
        : ''

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      memory_type: string
      content: string
      importance: number
    }>

    return parsed
      .filter(
        (m): m is { memory_type: ValidType; content: string; importance: number } =>
          VALID_TYPES.includes(m.memory_type as ValidType) && Boolean(m.content)
      )
      .map((m) => ({
        memory_type: m.memory_type,
        content: m.content.trim(),
        importance: Math.min(5, Math.max(1, Math.round(m.importance ?? 3))),
        source: 'chat',
      }))
      .filter(
        (m) =>
          shouldSaveMemory(m.content) &&
          deduplicateMemories(m.content, existingMemories)
      )
  } catch {
    return []
  }
}

// ── Persistence ───────────────────────────────────────────────────────────────

export async function saveMemories(
  memories: Memory[],
  userId: string,
  profileId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<void> {
  if (memories.length === 0) return
  await supabase.from('futureself_memories').insert(
    memories.map((m) => ({
      user_id: userId,
      futureself_profile_id: profileId,
      memory_type: m.memory_type,
      content: m.content,
      importance: m.importance,
      source: m.source,
    }))
  )
}
