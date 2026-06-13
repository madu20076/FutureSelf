'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { submitFeedbackAction } from '@/app/actions/feedback'

const CATEGORIES = [
  { value: 'bug',         label: 'Bug Report' },
  { value: 'feature',     label: 'Feature Request' },
  { value: 'ux',          label: 'Design / UX' },
  { value: 'performance', label: 'Performance' },
  { value: 'other',       label: 'Other' },
]

export default function FeedbackPage() {
  const [rating,   setRating]   = useState(0)
  const [category, setCategory] = useState('other')
  const [message,  setMessage]  = useState('')
  const [done,     setDone]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) { setErr('Please enter your feedback.'); return }
    setErr(null)
    startTransition(async () => {
      const res = await submitFeedbackAction({ rating, category, feedback: message })
      if (res.success) setDone(true)
      else setErr(res.error ?? 'Something went wrong.')
    })
  }

  return (
    <div className="min-h-screen bg-[#06060f] text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <Link href="/" className="text-base font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          FutureSelf
        </Link>
        <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/70 transition-colors">
          Dashboard
        </Link>
      </nav>

      <main className="flex-1 flex items-start justify-center px-6 py-14">
        <div className="w-full max-w-md">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white/85 mb-2">Thank you!</h1>
              <p className="text-sm text-white/40 mb-8">Your feedback helps shape FutureSelf during beta.</p>
              <Link href="/dashboard" className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white">
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 mb-4">
                  FutureSelf Beta
                </div>
                <h1 className="text-3xl font-bold text-white/85 mb-1">Share Feedback</h1>
                <p className="text-sm text-white/35">Every report directly improves the product.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Star rating */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/35 mb-3">
                    Overall Rating
                  </label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className={`text-2xl transition-all ${s <= rating ? 'text-amber-400' : 'text-white/15 hover:text-white/35'}`}
                        aria-label={`${s} star`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/35 mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 text-sm text-white/75 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 appearance-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value} className="bg-[#0d0d1f] text-white">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/35 mb-2">
                    Feedback
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What's working, what's broken, what's missing?"
                    rows={5}
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 resize-none"
                  />
                </div>

                {err && (
                  <p className="text-sm text-red-400/75">{err}</p>
                )}

                <button
                  type="submit"
                  disabled={isPending || !message.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Sending…' : 'Send Feedback'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
