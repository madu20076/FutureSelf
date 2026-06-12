'use client'

import { useState, useRef, useEffect, useCallback, FormEvent, KeyboardEvent } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import type { GeneratedProfile } from '@/lib/futureself/generate'
import type { OnboardingAnswers } from '@/app/actions/onboarding'
import { PushToTalk } from './push-to-talk'
import { RememberButton } from './remember-button'

function safeParseJson(text: string): Record<string, unknown> {
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type AudioState = {
  url?: string
  loading: boolean
  error?: string
  autoPlay?: boolean
}

type ResponseMode = 'text-voice' | 'voice-only' | 'text-only'

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

const LS_AUTOPLAY_KEY = 'futureself_autoplay_voice'
const LS_RESPONSE_MODE_KEY = 'futureself_response_mode'

const RESPONSE_MODES: ResponseMode[] = ['text-voice', 'voice-only', 'text-only']
const MODE_LABELS: Record<ResponseMode, string> = {
  'text-voice': 'Text + Voice',
  'voice-only': 'Voice Only',
  'text-only': 'Text Only',
}

function isValidMode(v: unknown): v is ResponseMode {
  return v === 'text-voice' || v === 'voice-only' || v === 'text-only'
}

export function ChatInterface({
  profile,
  userId,
  systemPrompt,
  voiceEnabled = false,
  voiceStyle = 'female-calm',
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  // keyed by committed message index
  const [audioMap, setAudioMap] = useState<Record<number, AudioState>>({})
  // Ref kept in sync so generateAudio can read latest state without stale closure
  const audioMapRef = useRef<Record<number, AudioState>>({})

  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false)
  const [responseMode, setResponseMode] = useState<ResponseMode>('text-voice')
  // True when the current input text came from a voice transcript
  const [fromVoice, setFromVoice] = useState(false)

  // Hydrate preferences from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setAutoPlayEnabled(localStorage.getItem(LS_AUTOPLAY_KEY) === 'true')
    const saved = localStorage.getItem(LS_RESPONSE_MODE_KEY)
    if (isValidMode(saved)) setResponseMode(saved)
  }, [])

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => { audioMapRef.current = audioMap }, [audioMap])

  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }

  function handleTranscript(text: string) {
    setInput(text)
    setFromVoice(true)
    requestAnimationFrame(() => resizeTextarea())
    textareaRef.current?.focus()
  }

  function toggleAutoPlay() {
    const next = !autoPlayEnabled
    setAutoPlayEnabled(next)
    localStorage.setItem(LS_AUTOPLAY_KEY, String(next))
  }

  function handleModeChange(mode: ResponseMode) {
    setResponseMode(mode)
    localStorage.setItem(LS_RESPONSE_MODE_KEY, mode)
  }

  const generateAudio = useCallback(
    async (idx: number, text: string, shouldAutoPlay = false) => {
      const existing = audioMapRef.current[idx]
      if (existing?.url || existing?.loading) return
      setAudioMap((prev) => ({ ...prev, [idx]: { loading: true, autoPlay: shouldAutoPlay } }))
      try {
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceStyle }),
        })
        const resText = await res.text()
        const data = safeParseJson(resText) as { audioUrl?: string; error?: string }
        if (data.audioUrl) {
          setAudioMap((prev) => ({
            ...prev,
            [idx]: { url: data.audioUrl, loading: false, autoPlay: prev[idx]?.autoPlay },
          }))
        } else {
          setAudioMap((prev) => ({
            ...prev,
            [idx]: { loading: false, error: data.error ?? 'Audio generation failed.' },
          }))
        }
      } catch (err) {
        console.error('[Voice] fetch error:', err)
        setAudioMap((prev) => ({
          ...prev,
          [idx]: { loading: false, error: 'Audio generation failed.' },
        }))
      }
    },
    [voiceStyle]
  )

  async function sendMessage(text: string, opts?: { forceAutoPlay?: boolean }) {
    if (!text.trim() || isStreaming) return

    setInput('')
    setFromVoice(false)
    setError(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { role: 'user', content: text.trim() }
    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setIsStreaming(true)
    setStreamingContent('')

    // Capture mode at send-time so it can't change mid-request
    const mode = responseMode

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
        const errText = await res.text().catch(() => '')
        const payload = safeParseJson(errText) as { error?: string }
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

      if (voiceEnabled && mode !== 'text-only' && accumulated.length > 0) {
        // voice-only always auto-plays; text-voice respects toggle / forceAutoPlay
        const shouldAutoPlay =
          mode === 'voice-only' ||
          opts?.forceAutoPlay ||
          autoPlayEnabled
        void generateAudio(assistantIdx, accumulated, shouldAutoPlay)
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
  // In voice-only mode, show text during streaming; hide in committed bubbles
  const effectiveMode = voiceEnabled ? responseMode : 'text-only'

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-0.5">
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-violet-600 text-white">
              Chat
            </span>
            <Link
              href="/conversation"
              className="rounded-full px-3 py-1 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
            >
              Conversation
            </Link>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block"
          >
            Dashboard
          </Link>
          <Link
            href="/me"
            className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block"
          >
            Profile
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block"
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
              showVoice={voiceEnabled}
              responseMode={effectiveMode}
            />
          ))}

          {isStreaming && (
            <Bubble
              msg={{ role: 'assistant', content: streamingContent }}
              name={profile.display_name}
              streaming
              showVoice={false}
              responseMode="text-voice"
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
        <div className="max-w-2xl mx-auto">

          {/* Controls row */}
          <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {voiceEnabled ? (
              <>
                {/* Talk button */}
                <PushToTalk onTranscript={handleTranscript} disabled={isStreaming} />

                {/* Response mode selector */}
                <div
                  role="group"
                  aria-label="Response mode"
                  className="flex rounded-full border border-white/10 bg-white/[0.04] p-0.5"
                >
                  {RESPONSE_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleModeChange(mode)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all whitespace-nowrap ${
                        responseMode === mode
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-white/35 hover:text-white/60'
                      }`}
                    >
                      {MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>

                {/* Auto-play toggle — only relevant for text+voice mode */}
                {responseMode === 'text-voice' && (
                  <button
                    role="switch"
                    aria-checked={autoPlayEnabled}
                    onClick={toggleAutoPlay}
                    className="flex items-center gap-2 group"
                  >
                    <span
                      className={`relative flex-shrink-0 w-7 h-4 rounded-full transition-colors ${
                        autoPlayEnabled ? 'bg-violet-600' : 'bg-white/15'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                          autoPlayEnabled ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </span>
                    <span className="text-xs text-white/35 group-hover:text-white/55 transition-colors select-none">
                      Auto-play
                    </span>
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-white/20">
                <Link
                  href="/me"
                  className="underline underline-offset-2 hover:text-white/40 transition-colors"
                >
                  Enable voice in your profile
                </Link>
                {' '}to hear FutureSelf speak.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-violet-500/40 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); setFromVoice(false); resizeTextarea() }}
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

          {/* Send & Speak Reply — appears after a voice transcript is loaded */}
          {fromVoice && input.trim() && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => sendMessage(input, { forceAutoPlay: true })}
                disabled={isStreaming}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/20 border border-violet-500/30 px-4 py-2 text-xs font-medium text-violet-300 hover:bg-violet-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                Send &amp; Speak Reply
              </button>
            </div>
          )}
        </div>
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
  responseMode = 'text-voice',
}: {
  msg: Message
  name: string
  streaming?: boolean
  audioState?: AudioState
  onRequestAudio?: () => void
  showVoice?: boolean
  responseMode?: ResponseMode
}) {
  const isUser = msg.role === 'user'
  const [isPlaying, setIsPlaying] = useState(false)
  const [playError, setPlayError] = useState<string | null>(null)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioState?.url) return
    setPlayError(null)
    const audio = new Audio(audioState.url)
    audioRef.current = audio
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => {
      setPlayError('Voice audio failed to load.')
      setIsPlaying(false)
    }

    // Auto-play when flagged — fires once when this URL first arrives
    if (audioState.autoPlay) {
      setIsPlaying(true)
      audio.play().catch(() => {
        setIsPlaying(false)
        setPlayError('Voice playback failed.')
      })
    }

    return () => {
      audio.pause()
      audio.onended = null
      audio.onerror = null
      if (audioRef.current === audio) audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioState?.url]) // intentionally omits autoPlay — read once at URL-load time

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
      setIsPlaying(true)
      audio.play().catch(() => {
        setIsPlaying(false)
        setPlayError('Voice playback failed.')
      })
    }
  }

  // ── Voice-only mode (committed assistant message) ─────────────────────────
  if (!isUser && !streaming && showVoice && responseMode === 'voice-only') {
    return (
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold shadow-sm shadow-violet-500/30">
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="flex flex-col gap-1 max-w-[75%]">
          <span className="text-xs text-white/25 ml-1">{name}</span>

          {/* Voice card */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
            {audioState?.loading ? (
              <span className="flex items-center gap-2 text-sm text-white/35">
                <span className="w-3.5 h-3.5 rounded-full border border-white/25 border-t-white/60 animate-spin flex-shrink-0" />
                Generating voice…
              </span>
            ) : audioState?.error || playError ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400/70">{audioState?.error ?? playError}</span>
                <button
                  onClick={() => { setPlayError(null); handleSpeakerClick() }}
                  className="text-xs text-red-400/50 hover:text-red-400 underline underline-offset-2 transition-colors flex-shrink-0"
                >
                  Retry
                </button>
              </div>
            ) : (
              <button
                onClick={handleSpeakerClick}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isPlaying ? 'text-violet-400' : 'text-white/60 hover:text-white/90'
                }`}
                title={isPlaying ? 'Stop' : 'Play'}
              >
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border ${
                  isPlaying
                    ? 'border-violet-500/50 bg-violet-500/15'
                    : 'border-white/15 bg-white/[0.05] hover:bg-white/[0.09]'
                } transition-all`}>
                  {isPlaying ? <StopIcon /> : <PlayIcon />}
                </span>
                {isPlaying ? 'Stop' : 'Play'}
              </button>
            )}

            {/* View Transcript toggle */}
            <button
              onClick={() => setTranscriptOpen((v) => !v)}
              className="mt-2.5 flex items-center gap-1 text-xs text-white/20 hover:text-white/45 transition-colors"
            >
              <ChevronIcon open={transcriptOpen} />
              {transcriptOpen ? 'Hide Transcript' : 'View Transcript'}
            </button>
          </div>

          {/* Collapsible transcript */}
          {transcriptOpen && (
            <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed text-white/55 bg-white/[0.03] border border-white/[0.05] whitespace-pre-wrap break-words">
              {msg.content}
            </div>
          )}

          {/* Remember this */}
          <div className="ml-1">
            <RememberButton assistantMessage={msg.content} />
          </div>
        </div>
      </div>
    )
  }

  // ── Standard layout (text-voice and text-only) ────────────────────────────
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

        {/* Voice playback row — text-voice mode only, committed assistant messages */}
        {!isUser && !streaming && showVoice && responseMode === 'text-voice' && (
          <div className="ml-1 mt-0.5">
            {audioState?.loading ? (
              <span className="flex items-center gap-1.5 text-xs text-white/25 py-1.5">
                <span className="w-3 h-3 rounded-full border border-white/25 border-t-white/60 animate-spin" />
                Generating voice…
              </span>
            ) : audioState?.error || playError ? (
              <div className="flex items-center gap-2 py-1.5">
                <span className="text-xs text-red-400/70">
                  {audioState?.error ?? playError}
                </span>
                <button
                  onClick={() => { setPlayError(null); handleSpeakerClick() }}
                  className="text-xs text-red-400/50 hover:text-red-400 underline underline-offset-2 transition-colors flex-shrink-0"
                >
                  Retry
                </button>
              </div>
            ) : (
              <button
                onClick={handleSpeakerClick}
                className={`flex items-center gap-1.5 text-xs py-1.5 px-2 -mx-2 rounded-md transition-colors ${
                  isPlaying ? 'text-violet-400' : 'text-white/30 hover:text-white/60'
                }`}
                title={isPlaying ? 'Stop' : 'Listen'}
              >
                {isPlaying ? <StopIcon /> : <PlayIcon />}
                {isPlaying ? 'Stop' : 'Listen'}
              </button>
            )}
          </div>
        )}

        {/* Remember this — committed assistant messages */}
        {!isUser && !streaming && (
          <div className="ml-1 mt-0.5">
            <RememberButton assistantMessage={msg.content} />
          </div>
        )}
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
