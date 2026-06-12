'use client'

import { useState, useTransition } from 'react'
import { saveMemoryAction } from '@/app/actions/memories'

export const MEMORY_CATEGORIES = [
  { value: 'goal',          label: 'Goal' },
  { value: 'win',           label: 'Win' },
  { value: 'challenge',     label: 'Challenge' },
  { value: 'project',       label: 'Project' },
  { value: 'relationship',  label: 'Relationship' },
  { value: 'preference',    label: 'Preference' },
  { value: 'belief',        label: 'Belief' },
  { value: 'personal_fact', label: 'Other' },
] as const

type Props = { assistantMessage: string }

export function RememberButton({ assistantMessage }: Props) {
  const [open, setOpen]       = useState(false)
  const [saved, setSaved]     = useState(false)
  const [note, setNote]       = useState('')
  const [category, setCategory] = useState('personal_fact')
  const [isPending, startTransition] = useTransition()
  const [error, setError]     = useState<string | null>(null)

  function handleOpen() {
    setNote('')
    setError(null)
    setSaved(false)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setError(null)
  }

  function handleSave() {
    if (!note.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await saveMemoryAction({
        content: note.trim(),
        memory_type: category,
        source: 'manual',
      })
      if (result.success) {
        setSaved(true)
        setTimeout(() => { setOpen(false); setSaved(false) }, 1500)
      } else {
        setError(result.error ?? 'Failed to save.')
      }
    })
  }

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400/80 py-1 select-none">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Saved to memories
      </span>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 text-xs text-white/20 hover:text-violet-400/70 transition-colors py-1 select-none"
        title="Save to memories"
      >
        <BookmarkIcon />
        Remember
      </button>
    )
  }

  return (
    <div className="mt-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 space-y-2.5">
      {/* Context hint */}
      <p className="text-[11px] text-white/25 leading-tight line-clamp-2">
        {assistantMessage.slice(0, 120)}{assistantMessage.length > 120 ? '…' : ''}
      </p>

      {/* What to remember */}
      <textarea
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What do you want to remember?"
        rows={2}
        className="w-full bg-transparent text-white/75 placeholder-white/20 text-xs leading-relaxed resize-none focus:outline-none border-b border-white/[0.08] pb-2"
      />

      {/* Category pills */}
      <div className="flex flex-wrap gap-1">
        {MEMORY_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-all ${
              category === c.value
                ? 'bg-violet-600/30 border border-violet-500/40 text-violet-300'
                : 'border border-white/10 text-white/30 hover:text-white/55 hover:border-white/20'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-[11px] text-red-400/70">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !note.trim()}
          className="rounded-full bg-violet-600/20 border border-violet-500/30 px-3 py-1 text-xs font-medium text-violet-300 hover:bg-violet-600/30 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="text-xs text-white/25 hover:text-white/55 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function BookmarkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}
