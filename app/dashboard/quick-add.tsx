'use client'

import { useState, useTransition } from 'react'
import { saveMemoryAction } from '@/app/actions/memories'

const QUICK_ACTIONS = [
  {
    type: 'goal',
    label: 'Goal',
    placeholder: "What's a goal you're working toward?",
    activeClass: 'bg-violet-600/20 border-violet-500/40 text-violet-300',
    iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  {
    type: 'project',
    label: 'Project',
    placeholder: "What are you actively building or working on?",
    activeClass: 'bg-blue-600/20 border-blue-500/40 text-blue-300',
    iconPath: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  },
  {
    type: 'win',
    label: 'Win',
    placeholder: "What's a recent win worth celebrating?",
    activeClass: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300',
    iconPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    type: 'challenge',
    label: 'Challenge',
    placeholder: "What challenge are you currently working through?",
    activeClass: 'bg-amber-600/20 border-amber-500/40 text-amber-300',
    iconPath: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  },
] as const

type ActionType = typeof QUICK_ACTIONS[number]['type']

export function QuickAddSection() {
  const [activeType, setActiveType] = useState<ActionType | null>(null)
  const [content, setContent]       = useState('')
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const active = QUICK_ACTIONS.find((a) => a.type === activeType)

  function openForm(type: ActionType) {
    setActiveType(activeType === type ? null : type)
    setContent('')
    setSaved(false)
    setError(null)
  }

  function handleSave() {
    if (!activeType || !content.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await saveMemoryAction({
        content: content.trim(),
        memory_type: activeType,
        source: 'dashboard',
      })
      if (result.success) {
        setSaved(true)
        setContent('')
        setTimeout(() => { setSaved(false); setActiveType(null) }, 1800)
      } else {
        setError(result.error ?? 'Failed to save.')
      }
    })
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/35 mb-4">
        Quick Add
      </p>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.type}
            type="button"
            onClick={() => openForm(a.type)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              activeType === a.type
                ? a.activeClass
                : 'border-white/10 text-white/45 hover:border-white/20 hover:text-white/70'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {a.label}
          </button>
        ))}
      </div>

      {/* Inline form */}
      {activeType && active && !saved && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={active.placeholder}
            rows={2}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
            }}
          />
          {error && <p className="text-xs text-red-400/70">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !content.trim()}
              className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:shadow-violet-500/35 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Saving…' : `Save ${active.label}`}
            </button>
            <button
              type="button"
              onClick={() => { setActiveType(null); setContent('') }}
              className="text-sm text-white/25 hover:text-white/55 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-sm text-emerald-400/80">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Saved! Your FutureSelf will reference this in future conversations.
        </div>
      )}
    </div>
  )
}
