'use client'

import { useState } from 'react'

type CardStatus = 'no-sample' | 'unconfigured' | 'pending' | 'creating' | 'ready' | 'error'

type VoiceSampleInfo = {
  audioUrl:     string
  duration:     number | null
  sampleId:     string
  cloneVoiceId: string | null
  cloneStatus:  string | null
}

type Props = {
  voiceCloneEnabled:   boolean
  initialVoiceSample:  VoiceSampleInfo | null
}

function resolveStatus(enabled: boolean, sample: VoiceSampleInfo | null): CardStatus {
  if (!sample) return 'no-sample'
  if (!enabled) return 'unconfigured'
  if (sample.cloneStatus === 'ready')      return 'ready'
  if (sample.cloneStatus === 'processing') return 'creating'
  if (sample.cloneStatus === 'error')      return 'error'
  return 'pending'
}

export function VoiceCloneCard({ voiceCloneEnabled, initialVoiceSample }: Props) {
  const [status,   setStatus]   = useState<CardStatus>(resolveStatus(voiceCloneEnabled, initialVoiceSample))
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleCreate() {
    setStatus('creating')
    setErrorMsg(null)
    try {
      const res  = await fetch('/api/voice-clone/create', { method: 'POST' })
      const data = (await res.json()) as { voiceId?: string; status?: string; error?: string }
      if (data.voiceId && data.status === 'ready') {
        setStatus('ready')
      } else {
        setStatus('error')
        setErrorMsg(data.error ?? 'Voice cloning failed. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-fuchsia-500/15 bg-gradient-to-br from-fuchsia-900/10 to-transparent p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center flex-shrink-0">
          <MicWaveIcon className={status === 'ready' ? 'text-emerald-400' : 'text-fuchsia-400'} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3 className="text-sm font-semibold text-white">Voice Cloning</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/[0.07] px-2 py-0.5 text-[10px] font-semibold text-fuchsia-400">
              ★ Premium
            </span>
            {status === 'ready' && (
              <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                Active
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-white/40 leading-relaxed mb-4">
            Your saved voice sample will eventually let FutureSelf speak in a voice that sounds like you.
          </p>

          {/* Consent notice — shown only before creating */}
          {(status === 'pending') && (
            <p className="text-[11px] text-amber-300/50 leading-relaxed mb-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2">
              Voice cloning uses your recorded sample. Only create a clone if you have permission to use this voice.
            </p>
          )}

          {/* Error message */}
          {errorMsg && status === 'error' && (
            <p className="text-[11px] text-red-400/70 mb-3">{errorMsg}</p>
          )}

          {/* State-specific CTA */}
          {status === 'no-sample' && (
            <p className="text-xs text-white/30 italic">
              Record a voice sample first in Voice Settings above.
            </p>
          )}

          {status === 'unconfigured' && (
            <button
              disabled
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/25 cursor-not-allowed"
            >
              <MicIcon size={13} />
              Create My Voice Clone
              <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[9px] font-bold leading-none text-amber-300/60">
                SOON
              </span>
            </button>
          )}

          {status === 'pending' && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-fuchsia-500/20 hover:scale-[1.02] transition-all"
            >
              <MicIcon size={13} className="text-white" />
              Create My Voice Clone
            </button>
          )}

          {status === 'creating' && (
            <div className="inline-flex items-center gap-2 text-sm text-white/40">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-fuchsia-400 animate-spin" />
              Creating voice clone…
            </div>
          )}

          {status === 'ready' && (
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 text-sm text-emerald-400">
                <CheckIcon />
                Voice Clone Ready — active in Conversation Mode
              </div>
              <p className="text-[11px] text-white/25">
                FutureSelf will now speak in your voice during voice conversations.
              </p>
            </div>
          )}

          {status === 'error' && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-sm font-medium text-red-400/80 hover:bg-red-500/10 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function MicWaveIcon({ className = 'text-fuchsia-400' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function MicIcon({ size = 18, className = 'text-white' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
