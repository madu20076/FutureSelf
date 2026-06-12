'use client'

import { useState, useTransition } from 'react'
import { saveProfileEditsAction } from '@/app/actions/profile'
import type { GeneratedProfile } from '@/lib/futureself/generate'

const SECTIONS = [
  'Personal Introduction',
  'Core Beliefs',
  'Life Lessons',
  'Goals & Ambitions',
  'Legacy',
] as const

type Section = (typeof SECTIONS)[number]

function parseSummary(summary: string): Record<Section, string> {
  const result = Object.fromEntries(SECTIONS.map((s) => [s, ''])) as Record<Section, string>
  summary.split('\n\n').forEach((chunk) => {
    const nl = chunk.indexOf('\n')
    if (nl !== -1) {
      const label = chunk.slice(0, nl).trim() as Section
      if ((SECTIONS as readonly string[]).includes(label)) {
        result[label] = chunk.slice(nl + 1).trim()
      }
    }
  })
  return result
}

function buildSummary(sections: Record<Section, string>): string {
  return SECTIONS.filter((s) => sections[s].trim())
    .map((s) => `${s}\n${sections[s].trim()}`)
    .join('\n\n')
}

type Props = {
  profile: GeneratedProfile
  username?: string | null
}

export function EditProfileForm({ profile, username }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [sections, setSections] = useState<Record<Section, string>>(() =>
    parseSummary(profile.personality_summary)
  )
  const [tone, setTone] = useState(profile.tone)
  const [boundaries, setBoundaries] = useState(profile.boundaries)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function handleCancel() {
    setSections(parseSummary(profile.personality_summary))
    setTone(profile.tone)
    setBoundaries(profile.boundaries)
    setFeedback(null)
    setIsEditing(false)
  }

  function handleSave() {
    setFeedback(null)
    startTransition(async () => {
      const result = await saveProfileEditsAction({
        personalitySummary: buildSummary(sections),
        tone,
        boundaries,
        username: username ?? null,
      })
      if (result.saved) {
        setFeedback({ type: 'success', message: 'Profile updated.' })
        setIsEditing(false)
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    })
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-2 mt-3">
        {feedback?.type === 'success' && (
          <p className="text-xs text-emerald-400">{feedback.message}</p>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="self-start inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/55 hover:bg-white/[0.08] hover:text-white/80 transition-all"
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
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Profile
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400 mb-1">
        Edit Profile
      </p>
      <p className="text-xs text-white/30 mb-6 leading-relaxed">
        Manual edits will improve how your FutureSelf speaks and responds.
      </p>

      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <div key={section}>
            <label className="block text-xs font-medium text-white/40 mb-1.5">
              {section}
            </label>
            <textarea
              value={sections[section]}
              onChange={(e) =>
                setSections((prev) => ({ ...prev, [section]: e.target.value }))
              }
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-colors"
              placeholder={`Describe your ${section.toLowerCase()}…`}
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-white/40 mb-1.5">Tone</label>
          <textarea
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-colors"
            placeholder="e.g. direct, warm, reflective…"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/40 mb-1.5">Boundaries</label>
          <textarea
            value={boundaries}
            onChange={(e) => setBoundaries(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-colors"
            placeholder="Topics your FutureSelf should avoid…"
          />
        </div>
      </div>

      {feedback?.type === 'error' && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {feedback.message}
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md hover:shadow-violet-500/30 transition-all"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/55 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
