import Anthropic from '@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type RequestBody = {
  message: string
  sessionId: string | null
  profileId: string
  history: Message[]
  systemPrompt: string
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'AI not configured.' },
      { status: 503 }
    )
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const {
    message,
    sessionId: incomingSessionId,
    profileId,
    history,
    systemPrompt,
  } = body

  if (!message?.trim()) {
    return Response.json({ error: 'message is required.' }, { status: 400 })
  }
  if (!profileId) {
    return Response.json({ error: 'profileId is required.' }, { status: 400 })
  }

  // ── Supabase (optional) ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: SupabaseClient<any> | null = null
  let sessionId: string | null = incomingSessionId

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  // Create session on first message
  if (supabase && !sessionId) {
    const { data: session } = await supabase
      .from('public_chat_sessions')
      .insert({ profile_id: profileId })
      .select('id')
      .single()
    sessionId = session?.id ?? null
  }

  // Save user message
  if (supabase && sessionId) {
    await supabase
      .from('public_chat_messages')
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
        if (supabase && sessionId && fullText) {
          await supabase
            .from('public_chat_messages')
            .insert({
              session_id: sessionId,
              role: 'assistant',
              content: fullText,
            })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Session-Id': sessionId ?? '',
    },
  })
}
