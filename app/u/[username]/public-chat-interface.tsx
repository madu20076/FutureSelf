'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

type Props = {
  profileId: string
  displayName: string
  systemPrompt: string
}

export function PublicChatInterface({
  profileId,
  displayName,
  systemPrompt,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || isLoading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setIsLoading(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/public-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          sessionId,
          profileId,
          history: newMessages.slice(-20),
          systemPrompt,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Failed to get response')

      const newSessionId = res.headers.get('X-Session-Id')
      if (newSessionId) setSessionId(newSessionId)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setStreamingText(full)
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: full }])
      setStreamingText('')
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-4">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-violet-400"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white mb-1">
          Chat with {displayName}&apos;s FutureSelf
        </h3>
        <p className="text-sm text-white/35 mb-5">
          Ask questions, seek advice, or just have a conversation.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] transition-all"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat With This FutureSelf
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              {displayName}&apos;s FutureSelf
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/30">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[400px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !streamingText && (
          <div className="text-center py-8">
            <p className="text-sm text-white/25">
              Start a conversation with {displayName}&apos;s FutureSelf.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} name={displayName} />
        ))}
        {streamingText && (
          <Bubble
            role="assistant"
            content={streamingText}
            name={displayName}
            streaming
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="border-t border-white/[0.06] p-4"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${displayName}'s FutureSelf…`}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 disabled:opacity-40 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md hover:shadow-violet-500/30 transition-all"
          >
            {isLoading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function Bubble({
  role,
  content,
  name,
  streaming,
}: {
  role: 'user' | 'assistant'
  content: string
  name: string
  streaming?: boolean
}) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          isUser
            ? 'bg-white/10 text-white/60'
            : 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white'
        }`}
      >
        {isUser ? 'Y' : name.charAt(0).toUpperCase()}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-white/[0.06] text-white/80 rounded-tr-sm'
            : 'bg-violet-500/10 border border-violet-500/20 text-white/85 rounded-tl-sm'
        }`}
      >
        {content}
        {streaming && (
          <span className="inline-block w-1 h-3.5 ml-0.5 bg-violet-400 animate-pulse rounded-sm align-middle" />
        )}
      </div>
    </div>
  )
}
