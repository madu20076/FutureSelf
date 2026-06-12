'use client'

import { useState, useTransition } from 'react'
import { generateFocusAction, toggleFocusAction } from '@/app/actions/focus'
import type { FocusRow } from '@/app/actions/focus'

export function FocusCard({ initialItems }: { initialItems: FocusRow[] }) {
  const [items, setItems]           = useState<FocusRow[]>(initialItems)
  const [pendingIds, setPendingIds] = useState(new Set<string>())
  const [error, setError]           = useState<string | null>(null)
  const [isGenerating, startGen]    = useTransition()

  const completed = items.filter(i => i.completed).length
  const total     = items.length
  const progress  = total > 0 ? (completed / total) * 100 : 0
  const allDone   = total > 0 && completed === total

  function handleGenerate() {
    setError(null)
    startGen(async () => {
      const result = await generateFocusAction()
      if (result.success && result.data) {
        setItems(result.data)
      } else {
        setError(result.error ?? 'Generation failed.')
      }
    })
  }

  async function handleToggle(id: string, checked: boolean) {
    if (pendingIds.has(id)) return
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed: checked } : i))
    setPendingIds(prev => { const s = new Set(prev); s.add(id); return s })
    const result = await toggleFocusAction(id, checked)
    setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    if (!result.success) {
      // Revert
      setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !checked } : i))
    }
  }

  return (
    <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-900/10 to-transparent bg-white/[0.025] p-6 mb-6">
      {/* Header row */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse flex-shrink-0" />
          <h2 className="text-sm font-semibold text-white/85">Today&apos;s Focus</h2>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/40 hover:border-fuchsia-500/40 hover:text-fuchsia-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isGenerating ? (
            <>
              <span className="w-3 h-3 rounded-full border border-fuchsia-400/60 border-t-transparent animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
              </svg>
              {total === 0 ? 'Generate Focus' : 'Regenerate'}
            </>
          )}
        </button>
      </div>

      {/* Progress sub-row */}
      {total > 0 && (
        <div className="pl-4 mb-4">
          <p className="text-xs text-white/30 mb-2">{completed} / {total} completed</p>
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {total === 0 && !isGenerating && (
        <div className="py-6 text-center mt-2">
          <p className="text-sm text-white/30 mb-1">No focus set for today.</p>
          <p className="text-xs text-white/20">
            Click &ldquo;Generate Focus&rdquo; to get personalized action items based on your goals and memories.
          </p>
        </div>
      )}

      {/* Generating skeleton */}
      {isGenerating && total === 0 && (
        <div className="mt-4 space-y-3 animate-pulse">
          {[72, 56, 80, 64].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-white/[0.06] flex-shrink-0" />
              <span className="h-3.5 rounded-full bg-white/[0.06]" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      )}

      {/* Focus items */}
      {total > 0 && (
        <div className="space-y-3 mt-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleToggle(item.id, !item.completed)}
              disabled={pendingIds.has(item.id)}
              className="w-full flex items-start gap-3 text-left group disabled:cursor-wait"
            >
              {/* Circle checkbox */}
              <span
                className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  item.completed
                    ? 'bg-fuchsia-500/25 border-fuchsia-400/60'
                    : 'border-white/[0.18] group-hover:border-fuchsia-400/50'
                }`}
              >
                {item.completed && (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-fuchsia-300"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              {/* Label */}
              <span
                className={`text-sm leading-snug transition-all duration-200 ${
                  item.completed
                    ? 'text-white/30 line-through decoration-white/20'
                    : 'text-white/75 group-hover:text-white/90'
                }`}
              >
                {item.focus_text}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* All-done celebration */}
      {allDone && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-xs text-emerald-400/70">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          All done for today. Great work!
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-400/70">{error}</p>}
    </div>
  )
}
