'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import type { GeneratedProfile } from '@/lib/futureself/generate'
import { RememberButton } from '@/app/chat/remember-button'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'creating_avatar'
  | 'preparing_avatar'
  | 'avatar_speaking'
  | 'error'

type Message = { role: 'user' | 'assistant'; content: string }

type LastExchange = { userText: string; assistantText: string }

type Props = {
  profile:        GeneratedProfile
  systemPrompt:   string
  voiceEnabled:   boolean
  voiceStyle:     string
  portraitUrl:    string | null
  cloneVoiceId:   string | null
  avatarEnabled:  boolean
}

type AvatarStatusResponse = {
  status:       string
  resultUrl:    string | null
  errorMessage: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeJson(text: string): Record<string, unknown> {
  try { return text ? JSON.parse(text) : {} } catch { return {} }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const PHASE_LABEL: Record<Phase, string> = {
  idle:             'Tap to Talk',
  listening:        'Listening…',
  transcribing:     'Transcribing…',
  thinking:         'Thinking…',
  speaking:         'Speaking…',
  creating_avatar:  'Creating avatar…',
  preparing_avatar: 'Preparing video…',
  avatar_speaking:  'Avatar speaking…',
  error:            'Something went wrong',
}

const AVATAR_PROCESSING: Phase[] = ['creating_avatar', 'preparing_avatar']
const MAX_AVATAR_POLLS = 30 // 30 × 2 s = 60 s

// ── Component ─────────────────────────────────────────────────────────────────

export function ConversationView({
  profile,
  systemPrompt,
  voiceEnabled,
  voiceStyle,
  portraitUrl,
  cloneVoiceId,
  avatarEnabled,
}: Props) {
  const [phase, setPhase]               = useState<Phase>('idle')
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)
  const [lastExchange, setLastExchange] = useState<LastExchange | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [avatarMode, setAvatarMode]     = useState(false)
  const [videoUrl, setVideoUrl]         = useState<string | null>(null)
  const [avatarNote, setAvatarNote]     = useState<string | null>(null)

  // Mutable refs — no re-render needed
  const historyRef  = useRef<Message[]>([])
  const sessionRef  = useRef<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const audioRef    = useRef<HTMLAudioElement | null>(null)

  // Derived
  const canUseAvatar = avatarEnabled && !!portraitUrl

  // ── Error helper ─────────────────────────────────────────────────────────────

  function fail(msg: string) {
    setErrorMsg(msg)
    setPhase('error')
  }

  // ── Recording ────────────────────────────────────────────────────────────────

  async function startListening() {
    if (!navigator.mediaDevices?.getUserMedia) {
      fail('Microphone requires HTTPS or localhost.')
      return
    }

    setAvatarNote(null)
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

  // ── Transcribe → Chat → Voice pipeline ──────────────────────────────────────

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
    try {
      let audioUrl: string | undefined

      // Try cloned voice first; fall back to OpenAI preset
      if (cloneVoiceId) {
        const cloneRes = await fetch('/api/voice-clone/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        const cloneData = safeJson(await cloneRes.text()) as { audioUrl?: string }
        audioUrl = cloneData.audioUrl
      }

      if (!audioUrl) {
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceStyle }),
        })
        const data = safeJson(await res.text()) as { audioUrl?: string; error?: string }
        if (!data.audioUrl) throw new Error(data.error ?? 'Voice generation failed.')
        audioUrl = data.audioUrl
      }

      // Try D-ID avatar if mode is on and we have everything we need
      if (avatarMode && canUseAvatar && portraitUrl) {
        try {
          await generateAvatar(text, audioUrl, portraitUrl)
          return
        } catch (err) {
          console.error('[avatar] D-ID failed, falling back to audio:', err)
          setAvatarNote('Avatar unavailable — playing voice only')
        }
      }

      await playAudio(audioUrl)
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Voice generation failed.')
    }
  }

  // ── D-ID avatar flow ─────────────────────────────────────────────────────────

  async function generateAvatar(text: string, audioUrl: string, portrait: string) {
    setPhase('creating_avatar')

    const genRes = await fetch('/api/avatar/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, audioUrl, portraitUrl: portrait }),
    })

    if (!genRes.ok) {
      const err = safeJson(await genRes.text()) as { error?: string }
      throw new Error(err.error ?? `Avatar generation failed (${genRes.status})`)
    }

    const { talkId } = (await genRes.json()) as { talkId?: string }
    if (!talkId) throw new Error('No talkId returned from D-ID')

    setPhase('preparing_avatar')

    for (let i = 0; i < MAX_AVATAR_POLLS; i++) {
      await sleep(2000)

      const statusRes = await fetch(
        `/api/avatar/status?talkId=${encodeURIComponent(talkId)}`
      )
      const statusData = (await statusRes.json()) as AvatarStatusResponse

      if (statusData.status === 'done' && statusData.resultUrl) {
        setVideoUrl(statusData.resultUrl)
        setPhase('avatar_speaking')
        return
      }

      if (statusData.status === 'error') {
        throw new Error(statusData.errorMessage ?? 'D-ID avatar failed')
      }
      // 'created' | 'started' → keep polling
    }

    throw new Error('Avatar timed out after 60 seconds')
  }

  // ── Audio playback ───────────────────────────────────────────────────────────

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
    } catch {
      fail('Audio playback failed. Please try again.')
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

  function stopAvatar() {
    setVideoUrl(null)
    setPhase('idle')
  }

  // ── Button handler ───────────────────────────────────────────────────────────

  function handleButtonTap() {
    if (phase === 'idle')             startListening()
    else if (phase === 'listening')   stopListening()
    else if (phase === 'speaking')    stopSpeaking()
    else if (phase === 'avatar_speaking') stopAvatar()
    // transcribing / thinking / creating_avatar / preparing_avatar → no-op
  }

  const buttonDisabled =
    phase === 'transcribing' ||
    phase === 'thinking' ||
    AVATAR_PROCESSING.includes(phase)

  const isListening    = phase === 'listening'
  const isSpeaking     = phase === 'speaking' || phase === 'avatar_speaking'
  const isProcessing   = phase === 'transcribing' || phase === 'thinking'
  const isAvatarWork   = AVATAR_PROCESSING.includes(phase)
  const isError        = phase === 'error'

  // ── Voice-not-enabled guard ──────────────────────────────────────────────────

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

  // ── Main render ──────────────────────────────────────────────────────────────

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
          <span className="rounded-full px-3 py-1 text-xs font-medium bg-violet-600 text-white inline-flex items-center gap-1.5">
            Conversation
            <span className="rounded-full bg-fuchsia-400/40 px-1 py-px text-[9px] font-bold leading-none">★</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs text-white/40 hover:text-white/70 transition-colors hidden sm:block">
            Dashboard
          </Link>
          <Link href="/coaching" className="text-xs text-white/40 hover:text-white/70 transition-colors hidden sm:block">
            Coaching
          </Link>
          <Link href="/reflection" className="text-xs text-white/40 hover:text-white/70 transition-colors hidden sm:block">
            Reflect
          </Link>
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

      {/* ── Portrait / Video area ── */}
      <div className="flex-shrink-0 relative" style={{ height: 'min(50vh, 440px)' }}>
        {videoUrl && phase === 'avatar_speaking' ? (
          /* D-ID result video */
          <video
            key={videoUrl}
            src={videoUrl}
            className="w-full h-full object-cover object-top"
            autoPlay
            playsInline
            onEnded={() => { setVideoUrl(null); setPhase('idle') }}
            onError={() => { setVideoUrl(null); setPhase('idle') }}
          />
        ) : portraitUrl ? (
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
          <p className="text-xs text-white/45">
            {phase === 'avatar_speaking' ? 'Talking Avatar' : 'Your FutureSelf'}
          </p>
        </div>

        {/* Avatar-processing overlay badge */}
        {isAvatarWork && (
          <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-[#06060f]/80 backdrop-blur-sm px-3 py-1.5">
            <span className="w-4 h-4 rounded-full border-2 border-fuchsia-400/40 border-t-fuchsia-400 animate-spin flex-shrink-0" />
            <span className="text-xs text-fuchsia-300 font-medium">{PHASE_LABEL[phase]}</span>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-5 overflow-y-auto">
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">

          {/* Status indicator */}
          <div className="h-10 flex items-center justify-center">
            {isProcessing || isAvatarWork ? (
              <span className="flex items-center gap-2 text-sm text-white/50">
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {PHASE_LABEL[phase]}
              </span>
            ) : isError ? (
              <span className="text-sm text-red-400/80 text-center leading-snug px-4 max-w-[280px]">
                {errorMsg}
              </span>
            ) : (
              <span className={`flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
                isListening ? 'text-red-400' : isSpeaking ? 'text-violet-300' : 'text-white/40'
              }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300 ${
                  isListening ? 'bg-red-400 animate-pulse' :
                  isSpeaking  ? 'bg-violet-400 animate-pulse' :
                  'bg-white/20'
                }`} />
                {PHASE_LABEL[phase]}
                {(isListening || isSpeaking) && (
                  <span className="text-white/30 font-normal text-xs">· Tap to stop</span>
                )}
              </span>
            )}
          </div>

          {/* Big mic / action button */}
          {isError ? (
            <button
              onClick={() => { setErrorMsg(null); setPhase('idle') }}
              className="w-24 h-24 rounded-full bg-red-500/[0.08] border border-red-500/20 flex items-center justify-center text-red-400/60 hover:bg-red-500/[0.15] hover:text-red-400 transition-all active:scale-95"
              aria-label="Try again"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleButtonTap}
              disabled={buttonDisabled}
              aria-label={PHASE_LABEL[phase]}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-600/20 border-2 border-red-500/60 text-red-400'
                  : isSpeaking
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-500/35'
                  : buttonDisabled
                  ? 'bg-white/[0.05] border border-white/10 text-white/20'
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-500/35 hover:scale-105 hover:shadow-violet-500/55'
              }`}
            >
              {/* Pulsing rings — listening */}
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-red-500/60 animate-ping" />
                  <span className="absolute -inset-3 rounded-full border border-red-500/30 animate-ping" style={{ animationDelay: '350ms' }} />
                  <span className="absolute -inset-6 rounded-full border border-red-500/15 animate-ping" style={{ animationDelay: '700ms' }} />
                </>
              )}
              {/* Pulsing rings — speaking */}
              {isSpeaking && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-violet-400/60 animate-ping" />
                  <span className="absolute -inset-3 rounded-full border border-fuchsia-400/30 animate-ping" style={{ animationDelay: '350ms' }} />
                  <span className="absolute -inset-6 rounded-full border border-violet-400/15 animate-ping" style={{ animationDelay: '700ms' }} />
                </>
              )}

              {/* Icon */}
              {buttonDisabled ? (
                <span className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
              ) : isListening || isSpeaking ? (
                <StopSquareIcon />
              ) : (
                <MicIcon />
              )}
            </button>
          )}

          {/* Empty state */}
          {!lastExchange && !isError && phase === 'idle' && (
            <p className="text-center text-sm text-white/25 leading-relaxed max-w-[240px]">
              Tap the microphone and start a conversation with your FutureSelf.
            </p>
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
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-white max-w-[85%] leading-relaxed">
                      {lastExchange.userText}
                    </div>
                  </div>
                  <div className="flex justify-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold mt-0.5">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/[0.07] px-4 py-2.5 text-white/80 leading-relaxed">
                        {lastExchange.assistantText}
                      </div>
                      <RememberButton assistantMessage={lastExchange.assistantText} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Talking Avatar section ── */}
          {canUseAvatar ? (
            /* D-ID configured + portrait exists — show active toggle */
            <div className="w-full mt-2 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.04] px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/65 truncate">Talking Avatar</p>
                <p className="text-[11px] text-white/30 truncate">
                  {avatarNote ?? 'Your FutureSelf with facial animation'}
                </p>
              </div>
              <button
                onClick={() => setAvatarMode((v) => !v)}
                disabled={phase !== 'idle' && phase !== 'error'}
                aria-label={avatarMode ? 'Disable talking avatar' : 'Enable talking avatar'}
                aria-pressed={avatarMode}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed ${
                  avatarMode
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600'
                    : 'bg-white/[0.08] border border-white/10'
                }`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                  avatarMode ? 'left-[26px]' : 'left-0.5'
                }`} />
              </button>
            </div>
          ) : avatarEnabled && !portraitUrl ? (
            /* D-ID configured but no portrait */
            <div className="w-full mt-2 rounded-2xl border border-fuchsia-500/10 bg-fuchsia-500/[0.04] px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/50 truncate">Talking Avatar</p>
                <p className="text-[11px] text-white/25 truncate">Add a portrait in Profile to activate</p>
              </div>
              <Link
                href="/portraits"
                className="flex-shrink-0 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/[0.07] px-3 py-1.5 text-[11px] font-medium text-fuchsia-400 hover:bg-fuchsia-500/[0.14] transition-colors"
              >
                Add Portrait
              </Link>
            </div>
          ) : (
            /* D-ID not configured — Coming Soon */
            <div className="w-full mt-2 rounded-2xl border border-fuchsia-500/10 bg-fuchsia-500/[0.04] px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/50 truncate">Talking Avatar</p>
                <p className="text-[11px] text-white/25 truncate">Facial animation for your FutureSelf</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/[0.07] px-2 py-0.5 text-[10px] font-semibold text-fuchsia-400">
                  ★ Premium
                </span>
                <button
                  disabled
                  className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/25 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
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
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function StopSquareIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  )
}
