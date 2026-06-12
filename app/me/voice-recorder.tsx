'use client'

import { useState, useRef, useEffect, ChangeEvent } from 'react'

function safeParseJson(text: string): Record<string, unknown> {
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

type RecorderPhase =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopped'
  | 'uploading'
  | 'done'
  | 'error'

type Props = {
  onUploaded?: (audioUrl: string) => void
  initialVoiceSample?: { audioUrl: string; duration: number | null } | null
}

export function VoiceRecorder({ onUploaded, initialVoiceSample }: Props) {
  // When a persisted sample exists, start in 'done' state so the saved UI shows.
  // Use useState initializers directly (not setAudioUrlTracked) so prevUrlRef stays
  // null — Supabase public URLs must not be passed to URL.revokeObjectURL.
  const [phase, setPhase] = useState<RecorderPhase>(initialVoiceSample ? 'done' : 'idle')
  const [hasConsent, setHasConsent] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(initialVoiceSample?.audioUrl ?? null)
  const [duration, setDuration] = useState<number | null>(initialVoiceSample?.duration ?? null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialVoiceSample?.audioUrl ?? null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const startTimeRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    }
  }, [])

  function setAudioUrlTracked(url: string | null) {
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    prevUrlRef.current = url
    setAudioUrl(url)
  }

  function loadDurationFromUrl(url: string) {
    const el = new Audio(url)
    el.onloadedmetadata = () => {
      if (isFinite(el.duration)) setDuration(Math.round(el.duration))
    }
  }

  function openFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  // Returns to idle, keeping any previously saved uploadedUrl so the button
  // label correctly shows "Replace Voice Sample" on the next save.
  function retake() {
    setAudioUrlTracked(null)
    blobRef.current = null
    setDuration(null)
    setPhase('idle')
    setErrorMsg(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function startRecording() {
    setPhase('requesting')
    setErrorMsg(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase('idle')
      setErrorMsg('No microphone was found. You can upload an audio file instead.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      startTimeRef.current = Date.now()

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setAudioUrlTracked(url)
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000))
        setPhase('stopped')
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      recorder.start()
      setPhase('recording')
    } catch (err) {
      setPhase('idle')
      const msg = err instanceof Error ? err.message : 'Could not access microphone.'
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('notfound')) {
        setErrorMsg('No microphone was found. You can upload an audio file instead.')
      } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setErrorMsg('Microphone permission denied. You can upload an audio file instead.')
      } else {
        setErrorMsg(msg)
      }
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    blobRef.current = file
    const url = URL.createObjectURL(file)
    setAudioUrlTracked(url)
    loadDurationFromUrl(url)
    setPhase('stopped')
    setErrorMsg(null)
  }

  async function handleUpload() {
    if (!blobRef.current || !hasConsent) return
    setPhase('uploading')
    setErrorMsg(null)

    const formData = new FormData()
    const mimeType = blobRef.current.type || 'audio/webm'
    const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'webm'
    formData.append('audio', blobRef.current, `sample.${ext}`)
    if (duration !== null) formData.append('duration', String(duration))

    try {
      const res = await fetch('/api/voice-sample', { method: 'POST', body: formData })
      const text = await res.text()
      const data = safeParseJson(text) as { audioUrl?: string; error?: string }
      if (data.audioUrl) {
        setUploadedUrl(data.audioUrl)
        setPhase('done')
        onUploaded?.(data.audioUrl)
      } else {
        setPhase('stopped')
        setErrorMsg(data.error ?? 'Upload failed.')
      }
    } catch {
      setPhase('stopped')
      setErrorMsg('Upload failed. Please try again.')
    }
  }

  const uploading = phase === 'uploading'
  const hasSample = phase === 'stopped' || uploading
  const isRecording = phase === 'recording'
  const isIdle = phase === 'idle' || phase === 'requesting' || phase === 'error'
  const canRecord = hasConsent && !uploading && phase !== 'recording' && phase !== 'requesting'
  const alreadySaved = uploadedUrl !== null

  // Single hidden file input — triggered by all "upload" actions via openFilePicker()
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".mp3,.wav,.m4a,.webm,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/webm"
      onChange={handleFileChange}
      className="sr-only"
    />
  )

  return (
    <div className="mt-6 pt-6 border-t border-white/[0.06]">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/35 mb-1">
        Voice Sample
      </p>
      <p className="text-xs text-white/30 mb-4 leading-relaxed">
        Save a voice sample for future personalized voice cloning. Current chat playback uses preset voices.
      </p>

      {/* Consent */}
      <label className="flex items-start gap-3 mb-5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={hasConsent}
          onChange={(e) => setHasConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-violet-600"
        />
        <span className="text-xs text-white/45 leading-relaxed">
          I understand this voice sample may be used to generate a personalized FutureSelf voice.
        </span>
      </label>

      {/* Error */}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400 mb-4">
          {errorMsg}
        </div>
      )}

      {/* ── State: preview ready (stopped / uploading) ── */}
      {hasSample && audioUrl && (
        <div>
          {/* Preview player */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 mb-4">
            <span className="text-xs text-white/35 block mb-2">
              {duration !== null ? `${duration}s recorded` : 'Sample ready'}
            </span>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={audioUrl} controls className="w-full h-8" style={{ colorScheme: 'dark' }} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary: save */}
            <button
              onClick={handleUpload}
              disabled={uploading || !hasConsent}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md hover:shadow-violet-500/30 transition-all"
            >
              {uploading ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-white/40 border-t-white animate-spin" />
                  Uploading…
                </>
              ) : alreadySaved ? 'Replace Voice Sample' : 'Use This Voice'}
            </button>

            {/* Retake */}
            {!uploading && (
              <button
                onClick={retake}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                Retake Recording
              </button>
            )}

            {/* Upload different */}
            {!uploading && (
              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Different File
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── State: saved ── */}
      {phase === 'done' && (
        <div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 mb-4">
            <div className="flex items-center gap-2 text-xs text-emerald-400 mb-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Voice sample saved.
            </div>
            <p className="text-xs text-emerald-400/60">
              You can re-record your voice as many times as you'd like.
            </p>
          </div>

          {/* Audio preview — shows on initial upload and after login with a persisted sample */}
          {audioUrl && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 mb-4">
              <span className="text-xs text-white/35 block mb-2">
                {duration !== null ? `${duration}s` : 'Saved sample'}
              </span>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={audioUrl} controls className="w-full h-8" style={{ colorScheme: 'dark' }} />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={retake}
              disabled={!hasConsent}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
              Retake Recording
            </button>

            <button
              type="button"
              onClick={openFilePicker}
              disabled={!hasConsent}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Replace Voice Sample
            </button>
          </div>
        </div>
      )}

      {/* ── State: recording ── */}
      {isRecording && (
        <button
          onClick={stopRecording}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/15 transition-all"
        >
          <span className="w-2.5 h-2.5 rounded bg-red-500 animate-pulse flex-shrink-0" />
          Stop Recording
        </button>
      )}

      {/* ── State: idle (idle / requesting / error) ── */}
      {isIdle && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={startRecording}
            disabled={!canRecord}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {phase === 'requesting' ? (
              <span className="w-2.5 h-2.5 rounded-full border border-white/25 border-t-white/70 animate-spin" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
            )}
            {phase === 'requesting' ? 'Requesting mic…' : 'Record Voice Sample'}
          </button>

          <button
            type="button"
            onClick={openFilePicker}
            disabled={!hasConsent}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Audio File
          </button>

          <p className="w-full text-xs text-white/20 mt-0.5">
            MP3, WAV, M4A, WebM · Max 20 MB
          </p>
        </div>
      )}

      {/* Single hidden file input shared across all states */}
      {fileInput}
    </div>
  )
}
