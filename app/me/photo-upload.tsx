'use client'

import { useState, useRef } from 'react'

type Props = {
  onUploaded?: (urls: string[]) => void
}

const MAX_SIZE_BYTES  = 10 * 1024 * 1024   // 10 MB
const MAX_PHOTOS      = 5

// ── Validation ────────────────────────────────────────────────────────────────

function validateFiles(files: File[], alreadyUploaded: number): string | null {
  const remaining = MAX_PHOTOS - alreadyUploaded

  if (files.length === 0) return null

  if (files.length > remaining) {
    return remaining === 0
      ? 'Maximum of 5 photos reached.'
      : `You can only add ${remaining} more photo${remaining === 1 ? '' : 's'}.`
  }

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

    // HEIC/HEIF — iOS converts these automatically with accept="image/*",
    // but other browsers may pass them through unmodified.
    if (['heic', 'heif'].includes(ext) || file.type === 'image/heic' || file.type === 'image/heif') {
      return `HEIC/HEIF files are not supported. On iPhone, go to Settings → Camera → Formats and choose "Most Compatible" to export as JPG, or share the photo as JPG from the Photos app.`
    }

    if (!file.type.startsWith('image/')) {
      return `"${file.name}" is not a recognised image. Please upload a JPG, PNG, or WebP file.`
    }

    if (file.size > MAX_SIZE_BYTES) {
      return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — photos must be under 10 MB.`
    }
  }

  return null
}

// ── XHR upload with progress ──────────────────────────────────────────────────

function uploadWithProgress(
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<{ ok: boolean; data: { urls?: string[]; error?: string } }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload-photo')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 95))
    }

    xhr.onload = () => {
      onProgress(100)
      try {
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, data: JSON.parse(xhr.responseText) })
      } catch {
        resolve({ ok: false, data: { error: 'Unexpected server response. Please try again.' } })
      }
    }

    xhr.onerror  = () => resolve({ ok: false, data: { error: 'Network error. Check your connection and try again.' } })
    xhr.onabort  = () => resolve({ ok: false, data: { error: 'Upload cancelled.' } })
    xhr.ontimeout = () => resolve({ ok: false, data: { error: 'Upload timed out. Try a smaller photo or a faster connection.' } })
    xhr.timeout  = 120_000

    xhr.send(formData)
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PhotoUpload({ onUploaded }: Props) {
  const [uploading,     setUploading]     = useState(false)
  const [progress,      setProgress]      = useState(0)
  const [uploadedUrls,  setUploadedUrls]  = useState<string[]>([])
  const [error,         setError]         = useState<string | null>(null)
  const [isDragging,    setIsDragging]    = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (list.length === 0) return

    // Clear any previous error when the user selects new files
    setError(null)

    const validationError = validateFiles(list, uploadedUrls.length)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    for (const file of list) formData.append('photos', file)

    const { ok, data } = await uploadWithProgress(formData, setProgress)

    setUploading(false)
    setProgress(0)

    // Reset input so the same file can be re-selected after an error
    if (inputRef.current) inputRef.current.value = ''

    if (!ok || !data.urls) {
      setError(data.error ?? 'Upload failed. Please try again.')
      return
    }

    const allUrls = [...uploadedUrls, ...data.urls]
    setUploadedUrls(allUrls)
    onUploaded?.(allUrls)
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const atMax    = uploadedUrls.length >= MAX_PHOTOS
  const canPick  = !uploading && !atMax
  const count    = uploadedUrls.length

  return (
    <div className="space-y-3">

      {/* ── Drop zone (tap to pick on mobile; drag on desktop) ── */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => canPick && inputRef.current?.click()}
        role="button"
        tabIndex={canPick ? 0 : -1}
        onKeyDown={(e) => e.key === 'Enter' && canPick && inputRef.current?.click()}
        aria-label="Choose photos"
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors select-none ${
          atMax
            ? 'border-white/10 bg-white/[0.01] cursor-default opacity-50'
            : isDragging
            ? 'border-violet-500/60 bg-violet-500/10 cursor-copy'
            : uploading
            ? 'border-white/15 bg-white/[0.02] cursor-wait'
            : 'border-white/20 bg-white/[0.02] cursor-pointer hover:border-violet-500/40 hover:bg-white/[0.04] active:bg-white/[0.06]'
        }`}
      >
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-violet-500/20' : 'bg-white/[0.05]'}`}>
          {uploading ? (
            <span className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={isDragging ? 'text-violet-400' : 'text-white/40'}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>

        {/* Label */}
        <div className="text-center">
          {uploading ? (
            <p className="text-sm text-white/50">Uploading photos…</p>
          ) : atMax ? (
            <p className="text-sm text-white/40">Maximum photos reached</p>
          ) : isDragging ? (
            <p className="text-sm font-medium text-violet-300">Drop to upload</p>
          ) : (
            <>
              <p className="text-sm font-medium text-white/70">
                Tap to choose
                <span className="hidden sm:inline"> or drag here</span>
              </p>
              <p className="text-xs text-white/30 mt-1">
                JPG, PNG, or WebP · Max 10 MB each
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      {uploading && (
        <div>
          <div className="flex items-center justify-between text-xs text-white/35 mb-1.5">
            <span>Uploading…</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── "Choose from Photos" button — primary tap target on mobile ── */}
      {!uploading && !atMax && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] py-3 text-sm font-medium text-violet-300 hover:bg-violet-500/[0.12] transition-all active:scale-[0.98]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Choose from Photos
          {count > 0 && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] text-violet-400">
              {count}/{MAX_PHOTOS}
            </span>
          )}
        </button>
      )}

      {/* Hidden file input — image/* lets iOS open photo library + auto-converts HEIC to JPG */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          handleFiles(e.target.files ?? [])
        }}
      />

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 flex-shrink-0 mt-px">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs text-red-300/90 leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Uploaded thumbnails ── */}
      {uploadedUrls.length > 0 && (
        <div>
          <p className="text-xs text-white/35 mb-2">
            {count} photo{count !== 1 ? 's' : ''} ready
          </p>
          <div className="flex flex-wrap gap-2">
            {uploadedUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Reference photo ${i + 1}`}
                className="w-16 h-16 rounded-xl object-cover border border-white/10"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
