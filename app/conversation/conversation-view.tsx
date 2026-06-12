'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import type { GeneratedProfile } from '@/lib/futureself/generate'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error'

type Message = { role: 'user' | 'assistant'; content: string }

type LastExchange = { userText: string; assistantText: string }

type Props = {
  profile: GeneratedProfile
  systemPrompt: string
  voiceEnabled: boolean
  voiceStyle: string
  portraitUrl: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeJson(text: string): Record<string, unknown> {
  try { return text ? JSON.parse(text) : {} } catch { return {} }
}

const PHASE_LABEL: Record<Phase, string> = {
  idle:         'Tap to Talk',
  listening:    'Listening…',
  transcribing: 'Transcribing…',
  thinking:     'Thinking…',
  speaking:     'Speaking…',
  error:        'Something went wrong',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConversationView({
  profile,
  systemPrompt,
  voiceEnabled,
  voiceStyle,
  portraitUrl,
}: Props) {
  const [phase, setPhase]               = useState<Phase>('idle')
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)
  const [lastExchange, setLastExchange] = useState<LastExchange | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  // Mutable refs — no re-render needed
  const historyRef    = useRef<Message[]>([])
  const sessionRef    = useRef<string | null>(null)
  const recorderRef   = useRef<MediaRecorder | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const chunksRef     = useRef<Blob[]>([])
  const audioRef      = useRef<HTMLAudioElement | null>(null)

  // ── Error helper ────────────────────────────────────────────────────────────

  function fail(msg: string) {
    setErrorMsg(msg)
    setPhase('error')
  }

  // ── Recording ───────────────────────────────────────────────────────────────

  async function startListening() {
    if (!navigator.mediaDevices?.getUserMedia) {
      fail('Microphone requires HTTPS or localhost.')
      return
    }

    setPhase('listening')
    let stream: MediaStream

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = err instanceof Error ? (err as DOMException).name ?? '' : ''
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
        fail('No microphone found on this device.')
      else if (name === 'NotAllowedError' || name === 'PermissionDeniedError')
        fail('Microphone permission denied. Allow access in browser settings.')
      else
        fail('Could not access microphone.')
      return
    }

    streamRef.current = stream
    chunksRef.current = []

    const recorder = new MediaRecorder(stream)
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      const mimeType = recorder.mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type: mimeType })
      await transcribeAudio(blob, mimeType)
    }

    recorder.start()
  }

  function stopListening() {
    if (recorderRef.current?.state === 'recording') {
      setPhase('transcribing')
      recorderRef.current.stop()
    }
  }

  // ── Transcribe → Chat → Voice pipeline ─────────────────────────────────────

  async function transcribeAudio(blob: Blob, mimeType: string) {
    setPhase('transcribing')
    try {
      const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'webm'
      const fd = new FormData()
      fd.append('audio', blob, `recording.${ext}`)

      const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const data = (await res.json()) as { transcript?: string; error?: string }

      if (data.transcript) await sendToChat(data.transcript)
      else fail(data.error ?? 'Transcription failed.')
    } catch {
      fail('Transcription failed. Please try again.')
    }
  }

  async function sendToChat(userText: string) {
    setPhase('thinking')

    const snapshot = historyRef.current
    const userMsg: Message = { role: 'user', content: userText }
    historyRef.current = [...snapshot, userMsg]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          sessionId: sessionRef.current,
          history: snapshot.slice(-20),
          systemPrompt,
        }),
      })

      if (!res.ok) {
        const payload = safeJson(await res.text().catch(() => '')) as { error?: string }
        throw new Error(payload.error ?? `Server error ${res.status}`)
      }

      const newSession = res.headers.get('X-Session-Id')
      if (newSession && !sessionRef.current) sessionRef.current = newSession

      // Consume the stream
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
      }

      historyRef.current = [...historyRef.current, { role: 'assistant', content: accumulated }]
      setLastExchange({ userText, assistantText: accumulated })

      await generateAndPlay(accumulated)
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  async function generateAndPlay(text: string) {
    // Still shows 'thinking' until audio is ready
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceStyle }),
      })
      const data = safeJson(await res.text()) as { audioUrl?: string; error?: string }
      if (!data.audioUrl) throw new Error(data.error ?? 'Voice generation failed.')
      await playAudio(data.audioUrl)
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Voice generation failed.')
    }
  }

  async function playAudio(url: string) {
    setPhase('speaking')
    const audio = new Audio(url)
    audioRef.current = audio

    audio.onended = () => {
      if (audioRef.current === audio) audioRef.current = null
      setPhase('idle')
    }
    audio.onerror = () => {
      if (audioRef.current === audio) audioRef.current = null
      fail('Audio playback failed.')
    }

    try {
      await audio.play()
    } catch (err) {
      fail(`Playback failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  function stopSpeaking() {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.onended = null
      audio.onerror = null
      audioRef.current = null
    }
    setPhase('idle')
  }

  // ── Derived button state ────────────────────────────────────────────────────

  function handleButtonTap() {
    if (phase === 'idle')      startListening()
    else if (phase === 'listening') stopListening()
    else if (phase === 'speaking')  stopSpeaking()
    // transcribing / thinking: no-op (button disabled)
  }

  const buttonDisabled = phase === 'transcribing' || phase === 'thinking'
  const isListening    = phase === 'listening'
  const isSpeaking     = phase === 'speaking'
  const isProcessing   = phase === 'transcribing' || phase === 'thinking'
  const isError        = phase === 'error'

  // ── Voice-not-enabled guard ─────────────────────────────────────────────────

  if (!voiceEnabled) {
    return (
      <div className="flex flex-col h-screen bg-[#06060f] text-white items-center justify-center gap-4 px-6 text-center">
        <p className="text-white/50 text-sm leading-relaxed max-w-xs">
          Conversation mode requires voice to be enabled in your profile settings.
        </p>
        <Link
          href="/me"
          className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white hover:shadow-md hover:shadow-violet-500/30 transition-all"
        >
          Enable Voice
        </Link>
        <Link href="/chat" className="text-xs text-white/25 hover:text-white/50 transition-colors">
          Back to Chat
        </Link>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[100dvh] bg-[#06060f] text-white overflow-hidden">

      {/* ── Nav ── */}
      <nav className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#06060f]/90 backdrop-blur-md z-10">
        <Link
          href="/"
          className="text-base font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
        >
          FutureSelf
        </Link>

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-0.5">
          <Link
            href="/chat"
            className="rounded-full px-3 py-1 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            Chat
          </Link>
          <span className="rounded-full px-3 py-1 text-xs font-medium bg-violet-600 text-white">
            Conversation
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/me" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            Profile
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-xs text-white/40 hover:text-white/70 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* ── Portrait ── */}
      <div className="flex-shrink-0 relative" style={{ height: 'min(42vh, 360px)' }}>
        {portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portraitUrl}
            alt={`${profile.display_name} FutureSelf portrait`}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-violet-950/60 via-[#06060f]/20 to-[#06060f]">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-5xl font-bold shadow-xl shadow-violet-500/25">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        {/* Fade to background */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#06060f] to-transparent pointer-events-none" />
        {/* Name overlay */}
        <div className="absolute bottom-4 left-5 pointer-events-none">
          <p className="text-base font-semibold text-white drop-shadow-lg">
            {profile.display_name}
          </p>
          <p className="text-xs text-white/45">Your FutureSelf</p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-5 overflow-y-auto">
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">

          {/* Phase label */}
          <div className="h-8 flex items-center justify-center">
            {isError ? (
              <span className="text-sm text-red-400/80 text-center leading-snug px-2">
                {errorMsg}
              </span>
            ) : isProcessing ? (
              <span className="flex items-center gap-2 text-sm text-white/40">
                <span className="w-3.5 h-3.5 rounded-full border border-white/25 border-t-white/60 animate-spin" />
                {PHASE_LABEL[phase]}
              </span>
            ) : (
              <span className={`text-sm font-medium transition-colors ${
                isListening ? 'text-red-400' : isSpeaking ? 'text-violet-400' : 'text-white/45'
              }`}>
                {PHASE_LABEL[phase]}
                {isListening && <span className="ml-2 text-white/30 font-normal text-xs">Tap to stop</span>}
                {isSpeaking  && <span className="ml-2 text-white/30 font-normal text-xs">Tap to stop</span>}
              </span>
            )}
          </div>

          {/* Big mic / action button */}
          {isError ? (
            <button
              onClick={() => { setErrorMsg(null); setPhase('idle') }}
              className="w-20 h-20 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center text-white/50 hover:bg-white/[0.12] hover:text-white/80 transition-all active:scale-95"
              aria-label="Dismiss error"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleButtonTap}
              disabled={buttonDisabled}
              aria-label={PHASE_LABEL[phase]}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-600/20 border-2 border-red-500/60 text-red-400'
                  : isSpeaking
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30'
                  : isProcessing
                  ? 'bg-white/[0.05] border border-white/10 text-white/20'
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:scale-105 hover:shadow-violet-500/50'
              }`}
            >
              {/* Pulsing rings — listening */}
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping" />
                  <span className="absolute -inset-3 rounded-full border border-red-500/20 animate-ping" style={{ animationDelay: '400ms' }} />
                </>
              )}
              {/* Pulsing rings — speaking */}
              {isSpeaking && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-violet-400/50 animate-ping" />
                  <span className="absolute -inset-3 rounded-full border border-fuchsia-400/20 animate-ping" style={{ animationDelay: '400ms' }} />
                </>
              )}

              {/* Icon */}
              {isProcessing ? (
                <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/50 animate-spin" />
              ) : isListening ? (
                <StopSquareIcon />
              ) : isSpeaking ? (
                <StopSquareIcon />
              ) : (
                <MicIcon />
              )}
            </button>
          )}

          {/* Transcript section */}
          {lastExchange && !isError && (
            <div className="w-full">
              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors mx-auto"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${showTranscript ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
              </button>

              {showTranscript && (
                <div className="mt-3 space-y-2 text-sm">
                  {/* User */}
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-white max-w-[85%] leading-relaxed">
                      {lastExchange.userText}
                    </div>
                  </div>
                  {/* Assistant */}
                  <div className="flex justify-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold mt-0.5">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/[0.07] px-4 py-2.5 text-white/80 max-w-[85%] leading-relaxed">
                      {lastExchange.assistantText}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg
      width="26"
      height="26"
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
  )
}

function StopSquareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  )
}
