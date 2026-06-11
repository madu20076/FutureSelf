'use client'

import { useState, useRef, useEffect, useCallback, FormEvent, KeyboardEvent } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import type { GeneratedProfile } from '@/lib/futureself/generate'
import type { OnboardingAnswers } from '@/app/actions/onboarding'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type AudioState = {
  url?: string
  loading: boolean
  error?: string
}

type Props = {
  profile: GeneratedProfile
  answers: OnboardingAnswers
  userId: string | null
  systemPrompt: string
  voiceEnabled?: boolean
  voiceStyle?: string
}

const SUGGESTIONS = () => [
  `What are your biggest goals right now?`,
  `How do you handle setbacks?`,
  `What advice do you wish you'd heard earlier?`,
]

export function ChatInterface({
  profile,
  userId,
  systemPrompt,
  voiceEnabled = false,
  voiceStyle = 'calm',
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  // keyed by committed message index
  const [audioMap, setAudioMap] = useState<Record<number, AudioState>>({})

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }

  const generateAudio = useCallback(
    async (idx: number, text: string) => {
      setAudioMap((prev) => ({ ...prev, [idx]: { loading: true } }))
      try {
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceStyle }),
        })
        const data = await res.json()
        if (data.audioUrl) {
          setAudioMap((prev) => ({ ...prev, [idx]: { url: data.audioUrl, loading: false } }))
        } else {
          setAudioMap((prev) => ({
            ...prev,
            [idx]: { loading: false, error: data.error ?? 'Audio generation failed.' },
          }))
        }
      } catch {
        setAudioMap((prev) => ({
          ...prev,
          [idx]: { loading: false, error: 'Audio generation failed.' },
        }))
      }
    },
    [voiceStyle]
  )

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return

    setInput('')
    setError(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { role: 'user', content: text.trim() }
    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId,
          history: messages.slice(-20),
          systemPrompt,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error ?? `Server error ${res.status}`)
      }

      const newSession = res.headers.get('X-Session-Id')
      if (newSession && !sessionId) setSessionId(newSession)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamingContent(accumulated)
      }

      const assistantIdx = updatedHistory.length
      setMessages((prev) => [...prev, { role: 'assistant', content: accumulated }])
      setStreamingContent('')

      if (voiceEnabled && accumulated.length > 0) {
        void generateAudio(assistantIdx, accumulated)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsStreaming(false)
      textareaRef.current?.focus()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <div className="flex flex-col h-screen bg-[#06060f] text-white">

      {/* ── Nav ── */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#06060f]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="text-lg font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent whitespace-nowrap"
          >
            FutureSelf
          </Link>
          <span className="text-white/20 hidden sm:block">·</span>
          <span className="text-sm text-white/35 truncate hidden sm:block">
            Chatting with {profile.display_name}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/me"
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Profile
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {isEmpty && (
            <div className="text-center pt-12 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto mb-5 text-2xl font-bold shadow-lg shadow-violet-500/30">
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {profile.display_name}&rsquo;s FutureSelf
              </h2>
              <p className="text-white/35 text-sm max-w-xs mx-auto leading-relaxed">
                Ask anything. I&rsquo;ll respond as {profile.display_name} — drawing from their beliefs, memories, and personality.
              </p>
              <div className="mt-8 flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS().map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s)
                      textareaRef.current?.focus()
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/45 hover:bg-white/[0.07] hover:text-white/75 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Bubble
              key={i}
              msg={msg}
              name={profile.display_name}
              audioState={msg.role === 'assistant' ? audioMap[i] : undefined}
              onRequestAudio={
                msg.role === 'assistant' ? () => generateAudio(i, msg.content) : undefined
              }
              showVoice={voiceEnabled && msg.role === 'assistant'}
            />
          ))}

          {isStreaming && (
            <Bubble
              msg={{ role: 'assistant', content: streamingContent }}
              name={profile.display_name}
              streaming
            />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex-shrink-0 px-4 pb-1">
          <div className="max-w-2xl mx-auto rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div className="flex-shrink-0 border-t border-white/[0.06] px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-violet-500/40 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); resizeTextarea() }}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${profile.display_name}'s FutureSelf…`}
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-white placeholder-white/25 resize-none focus:outline-none text-sm leading-relaxed disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-md hover:shadow-violet-500/30 transition-all"
            >
              {isStreaming ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-center text-xs text-white/18 mt-2 select-none">
            Enter to send &nbsp;·&nbsp; Shift + Enter for new line
          </p>
        </form>
      </div>
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({
  msg,
  name,
  streaming = false,
  audioState,
  onRequestAudio,
  showVoice = false,
}: {
  msg: Message
  name: string
  streaming?: boolean
  audioState?: AudioState
  onRequestAudio?: () => void
  showVoice?: boolean
}) {
  const isUser = msg.role === 'user'
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Sync audio element when URL becomes available
  useEffect(() => {
    if (audioState?.url) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioState.url)
        audioRef.current.onended = () => setIsPlaying(false)
      } else {
        audioRef.current.src = audioState.url
      }
    }
  }, [audioState?.url])

  function handleSpeakerClick() {
    if (!audioState?.url) {
      onRequestAudio?.()
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      audio.currentTime = 0
      setIsPlaying(false)
    } else {
      void audio.play()
      setIsPlaying(true)
    }
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold shadow-sm shadow-violet-500/30">
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && (
          <span className="text-xs text-white/25 ml-1">{name}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-tr-sm'
              : 'bg-white/[0.06] border border-white/[0.07] text-white/85 rounded-tl-sm'
          }`}
        >
          {msg.content}
          {streaming && !msg.content && (
            <span className="inline-flex gap-1 items-center h-4">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
          {streaming && msg.content && (
            <span className="inline-block w-0.5 h-[1em] bg-white/60 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </div>

        {/* Voice playback row — only for committed assistant messages */}
        {!isUser && !streaming && showVoice && (
          <div className="ml-1 mt-0.5">
            {audioState?.loading ? (
              <span className="flex items-center gap-1.5 text-xs text-white/25">
                <span className="w-3 h-3 rounded-full border border-white/25 border-t-white/60 animate-spin" />
                Generating audio…
              </span>
            ) : audioState?.error ? (
              <button
                onClick={handleSpeakerClick}
                className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                title="Retry audio"
              >
                <SpeakerIcon />
                Retry
              </button>
            ) : (
              <button
                onClick={handleSpeakerClick}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  isPlaying
                    ? 'text-violet-400'
                    : audioState?.url
                    ? 'text-white/30 hover:text-white/60'
                    : 'text-white/20 hover:text-white/40'
                }`}
                title={isPlaying ? 'Stop' : audioState?.url ? 'Play' : 'Generate audio'}
              >
                {isPlaying ? <StopIcon /> : <SpeakerIcon />}
                {isPlaying ? 'Stop' : audioState?.url ? 'Play' : 'Listen'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SpeakerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}
