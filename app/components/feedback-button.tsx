'use client'

import { useState, useTransition } from 'react'
import { submitFeedbackAction } from '@/app/actions/feedback'

const CATEGORIES = [
  { value: 'bug',         label: 'Bug Report' },
  { value: 'feature',     label: 'Feature Request' },
  { value: 'ux',          label: 'Design / UX' },
  { value: 'performance', label: 'Performance' },
  { value: 'other',       label: 'Other' },
]

export function FeedbackButton() {
  const [open,     setOpen]     = useState(false)
  const [rating,   setRating]   = useState(0)
  const [category, setCategory] = useState('other')
  const [message,  setMessage]  = useState('')
  const [done,     setDone]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    setDone(false)
    setErr(null)
    setRating(0)
    setMessage('')
  }

  function handleClose() {
    setOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) { setErr('Please enter your feedback.'); return }
    setErr(null)
    startTransition(async () => {
      const res = await submitFeedbackAction({ rating, category, feedback: message })
      if (res.success) { setDone(true); setTimeout(() => setOpen(false), 2000) }
      else setErr(res.error ?? 'Something went wrong.')
    })
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={handleOpen}
        aria-label="Give feedback"
        className="fixed bottom-6 right-4 z-40 w-11 h-11 rounded-full bg-[#1a1a2e] border border-white/[0.12] flex items-center justify-center text-white/50 hover:text-white/80 hover:border-violet-500/30 hover:bg-violet-950/60 shadow-lg transition-all active:scale-95"
        style={{ bottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="9" y1="10" x2="15" y2="10" />
          <line x1="9" y1="14" x2="13" y2="14" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Slide-up panel */}
      {open && (
        <div
          className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl border-t border-white/[0.08] bg-[#0d0d1f] shadow-2xl"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto px-6 pt-5 pb-2">
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />

            {done ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-white/80">Thank you!</p>
                <p className="text-sm text-white/35 mt-1">Your feedback has been received.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-white/85">Share Feedback</h2>
                  <button type="button" onClick={handleClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Stars */}
                <div className="flex gap-2">
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className={`text-xl transition-all ${s <= rating ? 'text-amber-400' : 'text-white/15 hover:text-white/35'}`}
                      aria-label={`${s} star`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                {/* Category */}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 py-2.5 text-sm text-white/75 focus:outline-none focus:border-violet-500/50 appearance-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#0d0d1f] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's working, what's broken, what's missing?"
                  rows={4}
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 resize-none"
                />

                {err && <p className="text-xs text-red-400/75">{err}</p>}

                <button
                  type="submit"
                  disabled={isPending || !message.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {isPending ? 'Sending…' : 'Send Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
