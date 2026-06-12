'use client'

import { useState, useRef } from 'react'

type Phase = 'idle' | 'requesting' | 'recording' | 'transcribing' | 'error'

type Props = {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function PushToTalk({ onTranscript, disabled = false }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  function dismiss() {
    setPhase('idle')
    setErrorMsg(null)
  }

  function setError(msg: string) {
    setErrorMsg(msg)
    setPhase('error')
  }

  async function startRecording() {
    setErrorMsg(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not available. This feature requires HTTPS or localhost.')
      return
    }

    setPhase('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = err instanceof Error ? (err as DOMException).name ?? err.message : ''
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No microphone found on this device.')
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Allow access in your browser settings.')
      } else {
        setError('Could not access microphone.')
      }
      return
    }

    streamRef.current = stream
    chunksRef.current = []

    const recorder = new MediaRecorder(stream)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      const mimeType = recorder.mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type: mimeType })
      setPhase('transcribing')
      await transcribe(blob, mimeType)
    }

    recorder.start()
    setPhase('recording')
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  async function transcribe(blob: Blob, mimeType: string) {
    try {
      const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'webm'
      const fd = new FormData()
      fd.append('audio', blob, `recording.${ext}`)

      const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const data = (await res.json()) as { transcript?: string; error?: string }

      if (data.transcript) {
        onTranscript(data.transcript)
        setPhase('idle')
      } else {
        setError(data.error ?? 'Transcription failed.')
      }
    } catch {
      setError('Transcription failed. Please try again.')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <span className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs text-red-400/80 leading-tight max-w-[200px] sm:max-w-xs">
          {errorMsg}
        </span>
        <button
          onClick={dismiss}
          className="text-red-400/50 hover:text-red-400 transition-colors text-xs leading-none flex-shrink-0"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </span>
    )
  }

  if (phase === 'recording') {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/15 transition-all flex-shrink-0"
      >
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        Listening… Stop
      </button>
    )
  }

  if (phase === 'transcribing' || phase === 'requesting') {
    const label = phase === 'transcribing' ? 'Transcribing…' : 'Requesting mic…'
    return (
      <span className="flex items-center gap-1.5 text-xs text-white/35 flex-shrink-0">
        <span className="w-3 h-3 rounded-full border border-white/25 border-t-white/60 animate-spin flex-shrink-0" />
        {label}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
      title="Speak your message"
    >
      <MicIcon />
      Talk
    </button>
  )
}

function MicIcon() {
  return (
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
  )
}
