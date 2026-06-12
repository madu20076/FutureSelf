'use client'

import { useState, useRef } from 'react'

type Props = {
  onUploaded?: (urls: string[]) => void
}

export function PhotoUpload({ onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (list.length === 0) return

    const remaining = 5 - uploadedUrls.length
    if (list.length > remaining) {
      setError(
        remaining === 0
          ? 'Maximum of 5 photos reached.'
          : `You can only add ${remaining} more photo${remaining === 1 ? '' : 's'}.`
      )
      return
    }

    setUploading(true)
    setError(null)

    const formData = new FormData()
    for (const file of list) formData.append('photos', file)

    const res = await fetch('/api/upload-photo', { method: 'POST', body: formData })
    const text = await res.text()
    const json = (text ? JSON.parse(text) : {}) as { urls?: string[]; error?: string }

    setUploading(false)

    if (!res.ok || !json.urls) {
      setError(json.error ?? 'Upload failed.')
      return
    }

    const allUrls = [...uploadedUrls, ...json.urls]
    setUploadedUrls(allUrls)
    onUploaded?.(allUrls)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear when leaving the drop zone itself, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const atMax = uploadedUrls.length >= 5
  const count = uploadedUrls.length

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && !atMax && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
          atMax
            ? 'border-white/10 bg-white/[0.01] cursor-default opacity-50'
            : isDragging
            ? 'border-violet-500/60 bg-violet-500/10 cursor-copy'
            : uploading
            ? 'border-white/15 bg-white/[0.02] cursor-wait'
            : 'border-white/20 bg-white/[0.02] cursor-pointer hover:border-violet-500/40 hover:bg-white/[0.04]'
        }`}
      >
        {/* Upload icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isDragging ? 'bg-violet-500/20' : 'bg-white/[0.05]'
          }`}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isDragging ? 'text-violet-400' : 'text-white/40'}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>

        {/* Labels */}
        <div className="text-center">
          {uploading ? (
            <p className="text-sm text-white/50">Uploading…</p>
          ) : atMax ? (
            <p className="text-sm text-white/40">Maximum photos reached</p>
          ) : isDragging ? (
            <p className="text-sm font-medium text-violet-300">Drop to upload</p>
          ) : (
            <>
              <p className="text-sm font-medium text-white/70">
                Drag &amp; drop or{' '}
                <span className="text-violet-400 underline underline-offset-2">choose files</span>
              </p>
              <p className="text-xs text-white/35 mt-1">Upload 1–5 photos</p>
            </>
          )}
        </div>

        {/* File constraints */}
        {!uploading && !atMax && (
          <div className="flex items-center gap-3 text-xs text-white/25">
            <span>JPG, PNG, WebP</span>
            <span className="w-px h-3 bg-white/15" />
            <span>Max 10 MB each</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files ?? [])}
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}

      {/* Uploaded thumbnails */}
      {uploadedUrls.length > 0 && (
        <div>
          <p className="text-xs text-white/35 mb-2">
            {count} photo{count !== 1 ? 's' : ''} uploaded
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
