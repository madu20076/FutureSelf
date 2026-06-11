'use client'

import { useState, useTransition } from 'react'
import { saveProfileSettingsAction } from '@/app/actions/profile'
import type { ResponseStyle } from '@/lib/futureself/generate'

const STYLE_OPTIONS: { value: ResponseStyle; label: string; hint: string }[] = [
  { value: 'Brief',    label: 'Brief',    hint: 'Short answers, under 80 words' },
  { value: 'Balanced', label: 'Balanced', hint: 'Default — 1–3 paragraphs'     },
  { value: 'Detailed', label: 'Detailed', hint: 'Expanded when needed'          },
]

type Props = {
  initialUsername: string | null
  initialIsPublic: boolean
  initialResponseStyle: ResponseStyle
}

export function ProfileSettings({
  initialUsername,
  initialIsPublic,
  initialResponseStyle,
}: Props) {
  const [username, setUsername] = useState(initialUsername ?? '')
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>(initialResponseStyle)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  function handleSave() {
    setFeedback(null)
    startTransition(async () => {
      const result = await saveProfileSettingsAction({
        username,
        isPublic,
        responseStyle,
      })
      if (result.saved) {
        setFeedback({ type: 'success', message: 'Settings saved.' })
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    })
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/35 mb-5">
        Profile Settings
      </p>

      {/* Username */}
      <div className="mb-5">
        <label className="block text-xs text-white/40 mb-2">Username</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/25 select-none whitespace-nowrap">
            /u/
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
              )
            }
            placeholder="yourname"
            maxLength={30}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition-colors"
          />
        </div>
        <p className="text-xs text-white/25 mt-1.5">
          Letters, numbers, hyphens, underscores. 3–30 characters.
        </p>
      </div>

      {/* Response Style */}
      <div className="mb-5">
        <label className="block text-xs text-white/40 mb-2">Response Style</label>
        <div className="flex gap-2">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setResponseStyle(opt.value)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                responseStyle === opt.value
                  ? 'bg-violet-600/30 border border-violet-500/50 text-violet-300'
                  : 'border border-white/10 bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/25 mt-1.5">
          {STYLE_OPTIONS.find((o) => o.value === responseStyle)?.hint}
        </p>
      </div>

      {/* Public toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-white/70 font-medium">Public Profile</p>
          <p className="text-xs text-white/30 mt-0.5">
            Anyone with your link can view and chat with your FutureSelf.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={isPublic}
          onClick={() => setIsPublic((p) => !p)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            isPublic
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600'
              : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              isPublic ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Feedback */}
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
        {isPending ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  )
}
