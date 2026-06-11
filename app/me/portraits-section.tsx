'use client'

import { useState } from 'react'
import Link from 'next/link'
import { generatePortraitAction } from '@/app/actions/portraits'
import {
  PORTRAIT_TYPES,
  PORTRAIT_TYPE_LABELS,
  type PortraitType,
} from '@/lib/futureself/portrait-prompt'
import type { Portrait } from '@/lib/futureself/portrait'
import { PhotoUpload } from './photo-upload'

type Props = {
  initialPortraits: Portrait[]
  hasReferencePhoto: boolean
}

export function PortraitsSection({ initialPortraits, hasReferencePhoto }: Props) {
  const [portraits, setPortraits] = useState<Record<string, Portrait>>(() => {
    const map: Record<string, Portrait> = {}
    for (const p of initialPortraits) {
      if (!map[p.portrait_type]) map[p.portrait_type] = p
    }
    return map
  })
  const [generating, setGenerating] = useState<Set<PortraitType>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showUpload, setShowUpload] = useState(false)
  // Tracks whether the user has uploaded at least one photo this session
  const [sessionHasPhoto, setSessionHasPhoto] = useState(false)

  const photoReady = hasReferencePhoto || sessionHasPhoto

  async function handleGenerate(type: PortraitType) {
    setGenerating((prev) => new Set(prev).add(type))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[type]
      return next
    })

    const result = await generatePortraitAction(type)

    setGenerating((prev) => {
      const next = new Set(prev)
      next.delete(type)
      return next
    })

    if (result.success) {
      setPortraits((prev) => ({
        ...prev,
        [type]: {
          id: result.data.id,
          user_id: '',
          futureself_profile_id: null,
          portrait_type: result.data.portrait_type,
          image_url: result.data.image_url,
          prompt_used: null,
          created_at: new Date().toISOString(),
        },
      }))
    } else {
      setErrors((prev) => ({ ...prev, [type]: result.error }))
    }
  }

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/35">
          Future Portraits
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              showUpload
                ? 'border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
                : 'border-white/15 bg-white/[0.04] text-white/60 hover:border-white/25 hover:text-white/80'
            }`}
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
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {showUpload ? 'Hide photos' : 'Add reference photos'}
          </button>
          <Link
            href="/portraits"
            className="text-xs text-violet-400/70 hover:text-violet-400 transition-colors"
          >
            View all →
          </Link>
        </div>
      </div>

      {/* Photo upload panel */}
      {showUpload && (
        <div className="mb-5 rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5">
          <p className="text-sm font-medium text-white/70 mb-1">Reference Photos</p>
          <p className="text-xs text-white/40 mb-4">
            Reference photos help FutureSelf generate portraits that look more like you.
          </p>
          <PhotoUpload
            onUploaded={() => setSessionHasPhoto(true)}
          />
        </div>
      )}

      {/* No-photo gate */}
      {!photoReady && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400 mt-0.5 flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="text-xs font-medium text-amber-300">
              Upload a reference photo first to generate a portrait that looks like you.
            </p>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="mt-1 text-xs text-amber-400/70 hover:text-amber-400 underline underline-offset-2 transition-colors"
            >
              Add reference photo →
            </button>
          </div>
        </div>
      )}

      {/* Likeness tip — shown once photos are ready */}
      {photoReady && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-violet-400 flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-xs text-white/40">
            For best likeness, upload a clear front-facing photo.
          </p>
        </div>
      )}

      {/* Portrait cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PORTRAIT_TYPES.map((type) => {
          const portrait = portraits[type] ?? null
          const isGenerating = generating.has(type)
          const error = errors[type] ?? null

          return (
            <PortraitCard
              key={type}
              label={PORTRAIT_TYPE_LABELS[type]}
              portrait={portrait}
              isGenerating={isGenerating}
              error={error}
              disabled={!photoReady}
              onGenerate={() => handleGenerate(type)}
            />
          )
        })}
      </div>
    </div>
  )
}

function PortraitCard({
  label,
  portrait,
  isGenerating,
  error,
  disabled,
  onGenerate,
}: {
  label: string
  portrait: Portrait | null
  isGenerating: boolean
  error: string | null
  disabled: boolean
  onGenerate: () => void
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
      {/* Image area */}
      <div className="aspect-square relative bg-white/[0.02]">
        {isGenerating ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-white/25">Generating…</p>
          </div>
        ) : portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portrait.image_url}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/10"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3">
        <p className="text-xs font-medium text-white/60 leading-tight mb-2">{label}</p>
        {error && <p className="text-xs text-red-400 mb-2 leading-tight">{error}</p>}
        <button
          onClick={onGenerate}
          disabled={isGenerating || disabled}
          className="w-full rounded-lg bg-violet-600/15 hover:bg-violet-600/30 border border-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating…' : portrait ? 'Regenerate' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
