'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deletePortraitAction, generatePortraitAction } from '@/app/actions/portraits'
import { PORTRAIT_TYPE_LABELS, type PortraitType } from '@/lib/futureself/portrait-prompt'
import type { Portrait } from '@/lib/futureself/portrait'

export function PortraitGalleryCard({ portrait: initial }: { portrait: Portrait }) {
  const [portrait, setPortrait] = useState(initial)
  const [isDeleted, setIsDeleted] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startDeleteTransition] = useTransition()
  const router = useRouter()

  if (isDeleted) return null

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deletePortraitAction(portrait.id)
      if (result.success) {
        setIsDeleted(true)
        router.refresh()
      } else {
        setError(result.error ?? 'Delete failed.')
      }
    })
  }

  async function handleRegenerate() {
    setIsRegenerating(true)
    setError(null)
    const result = await generatePortraitAction(portrait.portrait_type as PortraitType)
    setIsRegenerating(false)
    if (result.success) {
      setPortrait((prev) => ({
        ...prev,
        id: result.data.id,
        image_url: result.data.image_url,
      }))
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  const label =
    PORTRAIT_TYPE_LABELS[portrait.portrait_type as PortraitType] ?? portrait.portrait_type

  const date = new Date(portrait.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden group">
      {/* Image */}
      <div className="aspect-square relative bg-white/[0.02]">
        {isRegenerating ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-white/30">Regenerating…</p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portrait.image_url} alt={label} className="w-full h-full object-cover" />
        )}
      </div>

      {/* Footer */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-xs font-medium text-white/70 leading-tight">{label}</p>
          <button
            onClick={handleDelete}
            disabled={isRegenerating}
            aria-label="Delete portrait"
            className="flex-shrink-0 p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
        <p className="text-white/25 text-xs mb-2">{date}</p>
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="w-full rounded-lg bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-400/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isRegenerating ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>
    </div>
  )
}
