'use client'

import { useState, useTransition } from 'react'
import { saveVoiceSettingsAction } from '@/app/actions/voice'
import { VOICE_STYLES, VOICE_STYLE_LABELS, type VoiceStyle } from '@/lib/futureself/voice'
import { VoiceRecorder } from './voice-recorder'

const STYLE_HINTS: Record<VoiceStyle, string> = {
  'female-calm': 'Smooth and measured — the default',
  'female-warm': 'Bright and expressive',
  'male-calm':   'Warm and authoritative',
  'male-deep':   'Resonant and considered',
  'neutral':     'Balanced, gender-neutral tone',
}

type Props = {
  initialEnabled: boolean
  initialStyle: VoiceStyle
  initialVoiceSample?: { audioUrl: string; duration: number | null } | null
}

export function VoiceSettings({ initialEnabled, initialStyle, initialVoiceSample }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [style, setStyle] = useState<VoiceStyle>(initialStyle)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function handleSave() {
    setFeedback(null)
    startTransition(async () => {
      const result = await saveVoiceSettingsAction({ voiceEnabled: enabled, voiceStyle: style })
      if (result.saved) {
        setFeedback({ type: 'success', message: 'Voice settings saved.' })
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    })
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/35 mb-5">
        Voice Settings
      </p>

      {/* Enable toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-white/70 font-medium">Voice FutureSelf</p>
          <p className="text-xs text-white/30 mt-0.5">
            Hear your FutureSelf speak each response aloud.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            enabled
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600'
              : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Style selector */}
      <div className="mb-6">
        <label className="block text-xs text-white/40 mb-2">Voice Style</label>
        <div className="flex flex-wrap gap-2">
          {VOICE_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                style === s
                  ? 'bg-violet-600/30 border border-violet-500/50 text-violet-300'
                  : 'border border-white/10 bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]'
              }`}
            >
              {VOICE_STYLE_LABELS[s]}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/25 mt-1.5">{STYLE_HINTS[style]}</p>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm mb-4 ${
            feedback.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md hover:shadow-violet-500/30 transition-all"
      >
        {isPending ? 'Saving…' : 'Save Voice Settings'}
      </button>

      <VoiceRecorder initialVoiceSample={initialVoiceSample ?? null} />

      {/* ── Coming Soon: Use My Recorded Voice ── */}
      <div className="mt-6 pt-6 border-t border-white/[0.06]">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <p className="text-sm font-medium text-white/35">Use My Recorded Voice</p>
            <p className="text-xs text-white/20 mt-0.5">
              Personalized voice cloning powered by your sample.
            </p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-white/25">
            Coming Soon
          </span>
        </div>
        <p className="text-xs text-white/15 leading-relaxed">
          Once available, FutureSelf will generate responses in a voice that sounds like you — using your saved sample above.
        </p>
      </div>
    </div>
  )
}
