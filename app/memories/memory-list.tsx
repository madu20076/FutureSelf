'use client'

import { useState, useTransition } from 'react'
import { DeleteMemoryButton } from './delete-button'
import { editMemoryAction } from '@/app/actions/memories'

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  goal:                 { label: 'Goal',         color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  challenge:            { label: 'Challenge',    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  win:                  { label: 'Win',          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  project:              { label: 'Project',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  relationship:         { label: 'Relationship', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  preference:           { label: 'Preference',   color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  belief:               { label: 'Belief',       color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' },
  lesson:               { label: 'Lesson',       color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  decision:             { label: 'Decision',     color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  personal_fact:        { label: 'Personal Fact', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  communication_style:  { label: 'Style',        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
}

const FILTER_TABS = [
  { value: 'all',          label: 'All' },
  { value: 'goal',         label: 'Goals' },
  { value: 'win',          label: 'Wins' },
  { value: 'project',      label: 'Projects' },
  { value: 'challenge',    label: 'Challenges' },
  { value: 'relationship', label: 'Relationships' },
  { value: 'preference',   label: 'Preferences' },
  { value: 'belief',       label: 'Beliefs' },
] as const

export type MemoryRow = {
  id: string
  memory_type: string
  content: string
  importance: number
  created_at: string
}

type EditState = {
  id: string
  content: string
  memory_type: string
}

function ImportanceDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            i < score ? 'bg-violet-400' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  )
}

function EditMemoryForm({
  edit,
  onClose,
}: {
  edit: EditState
  onClose: () => void
}) {
  const [content, setContent] = useState(edit.content)
  const [memType, setMemType] = useState(edit.memory_type)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const editableTypes = Object.entries(CATEGORY_META).map(([value, { label }]) => ({ value, label }))

  function handleSave() {
    if (!content.trim()) return
    startTransition(async () => {
      const result = await editMemoryAction(edit.id, content, memType)
      if (result.success) {
        onClose()
      } else {
        setError(result.error ?? 'Failed to save.')
      }
    })
  }

  return (
    <div className="space-y-3 py-1">
      <textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
      />
      <div className="flex flex-wrap gap-1">
        {editableTypes.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setMemType(t.value)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${
              memType === t.value
                ? 'bg-violet-600/30 border border-violet-500/40 text-violet-300'
                : 'border border-white/10 text-white/30 hover:text-white/55'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-400/70">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !content.trim()}
          className="rounded-full bg-violet-600/20 border border-violet-500/30 px-3 py-1 text-xs font-medium text-violet-300 hover:bg-violet-600/30 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-white/25 hover:text-white/55 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function MemoryList({ memories }: { memories: MemoryRow[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [editId, setEditId] = useState<string | null>(null)

  const filtered = memories.filter((m) => {
    const matchesFilter = filter === 'all' || m.memory_type === filter
    const matchesQuery =
      !query.trim() || m.content.toLowerCase().includes(query.trim().toLowerCase())
    return matchesFilter && matchesQuery
  })

  if (memories.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories…"
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/75 placeholder-white/25 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter tabs — horizontally scrollable on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === 'all'
            ? memories.length
            : memories.filter((m) => m.memory_type === tab.value).length
          if (count === 0 && tab.value !== 'all') return null
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                filter === tab.value
                  ? 'bg-violet-600/30 border border-violet-500/40 text-violet-300'
                  : 'border border-white/10 text-white/35 hover:text-white/60'
              }`}
            >
              {tab.label}
              {tab.value !== 'all' && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Memory items */}
      {filtered.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-8">No memories match your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const meta = CATEGORY_META[m.memory_type] ?? {
              label: m.memory_type,
              color: 'text-white/50 bg-white/5 border-white/10',
            }
            const date = new Date(m.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })
            const isEditing = editId === m.id

            return (
              <div
                key={m.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-block text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.color}`}>
                        {meta.label}
                      </span>
                      <ImportanceDots score={m.importance} />
                    </div>

                    {isEditing ? (
                      <EditMemoryForm
                        edit={{ id: m.id, content: m.content, memory_type: m.memory_type }}
                        onClose={() => setEditId(null)}
                      />
                    ) : (
                      <>
                        <p className="text-white/80 text-sm leading-relaxed">{m.content}</p>
                        <p className="text-white/25 text-xs mt-2">{date}</p>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditId(m.id)}
                        aria-label="Edit memory"
                        className="p-1.5 rounded-lg text-white/25 hover:text-violet-400 hover:bg-violet-400/10 transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <DeleteMemoryButton memoryId={m.id} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
