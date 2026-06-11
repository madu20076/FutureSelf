import Anthropic from '@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { after } from 'next/server'
import {
  extractMemoriesFromConversation,
  saveMemories,
} from '@/lib/futureself/memory'

export const dynamic = 'force-dynamic'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type RequestBody = {
  message: string
  sessionId: string | null
  history: Message[]
  systemPrompt: string
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'AI not configured — add ANTHROPIC_API_KEY to your environment.' },
      { status: 503 }
    )
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { message, sessionId: incomingSessionId, history, systemPrompt } = body

  if (!message?.trim()) {
    return Response.json({ error: 'message is required.' }, { status: 400 })
  }

  // ── Supabase (optional) ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: SupabaseClient<any> | null = null
  let userId: string | null = null
  let sessionId: string | null = incomingSessionId

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value
    if (token) {
      supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id ?? null
    }
  }

  // Create session on first message
  if (supabase && userId && !sessionId) {
    const { data: session } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title: message.slice(0, 80) })
      .select('id')
      .single()
    sessionId = session?.id ?? null
  }

  // Save user message
  if (supabase && sessionId) {
    await supabase
      .from('chat_messages')
      .insert({ session_id: sessionId, role: 'user', content: message })
  }

  // ── Anthropic ────────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey })

  const apiMessages: Message[] = [
    ...history.slice(-20),
    { role: 'user', content: message },
  ]

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: apiMessages,
  })

  // ── Streaming response ───────────────────────────────────────────────────
  const encoder = new TextEncoder()
  let fullText = ''

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = event.delta.text
            fullText += chunk
            controller.enqueue(encoder.encode(chunk))
          }
        }
        // Save assistant reply after full response is collected
        if (supabase && sessionId && fullText) {
          await supabase
            .from('chat_messages')
            .insert({ session_id: sessionId, role: 'assistant', content: fullText })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  // ── Memory extraction (runs after response is sent — zero user-facing latency) ─
  if (supabase && userId) {
    after(async () => {
      if (!fullText) return
      try {
        // Resolve the FutureSelf profile ID
        const { data: profRow } = await supabase!
          .from('futureself_profiles')
          .select('id')
          .eq('user_id', userId!)
          .single()
        if (!profRow?.id) return

        // Load recent memories for deduplication context
        const { data: existingMems } = await supabase!
          .from('futureself_memories')
          .select('content')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false })
          .limit(20)

        const extracted = await extractMemoriesFromConversation(
          message,
          fullText,
          existingMems ?? []
        )

        if (extracted.length > 0) {
          await saveMemories(extracted, userId!, profRow.id, supabase!)
        }
      } catch {
        // Memory extraction is best-effort — never surface errors to the user
      }
    })
  }

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Session-Id': sessionId ?? '',
    },
  })
}
