'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saveReflectionAnswers } from '@/app/actions/reflection'

const STEPS = [
  {
    n: 1,
    question: 'What progress did you make this week?',
    hint: 'Think about goals, projects, and what you moved forward — big or small.',
    type: 'win' as const,
    badge: 'Win',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
    placeholder: 'e.g. Finished the landing page, had a productive client meeting…',
  },
  {
    n: 2,
    question: 'What wins are you celebrating?',
    hint: 'Big or small — every win counts. Name them.',
    type: 'win' as const,
    badge: 'Win',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
    placeholder: 'e.g. Finally shipped the feature, got great feedback from a user…',
  },
  {
    n: 3,
    question: 'What challenges came up?',
    hint: "Awareness is the first step. Be honest — your FutureSelf won't judge.",
    type: 'challenge' as const,
    badge: 'Challenge',
    badgeClass: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    placeholder: 'e.g. Struggled with focus, had a difficult conversation…',
  },
  {
    n: 4,
    question: 'What should next week look like?',
    hint: 'Set intentions, goals, or projects to focus on.',
    type: 'goal' as const,
    badge: 'Goal',
    badgeClass: 'bg-violet-500/10 border-violet-500/25 text-violet-300',
    placeholder: 'e.g. Finish the proposal, reach out to 3 potential clients…',
  },
] as const

function CompleteScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center mb-6">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-fuchsia-400"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-3">
        Reflection Complete
      </h2>
      <p className="text-white/45 text-sm max-w-sm leading-relaxed mb-8">
        Your FutureSelf will use this reflection to guide future conversations and next week&apos;s focus.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all"
        >
          View Dashboard
        </Link>
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.05] hover:text-white/80 transition-all"
        >
          Talk to FutureSelf
        </Link>
      </div>
    </div>
  )
}

export function ReflectionFlow() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers]     = useState(() => STEPS.map(() => ''))
  const [animating, setAnimating] = useState(false)
  const [complete, setComplete]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const step    = STEPS[stepIndex]
  const isLast  = stepIndex === STEPS.length - 1
  const canNext = answers[stepIndex].trim().length > 0

  function setAnswer(value: string) {
    setAnswers(prev => prev.map((a, i) => (i === stepIndex ? value : a)))
  }

  async function handleNext() {
    if (!canNext || animating || saving) return
    setError(null)

    if (isLast) {
      setSaving(true)
      const result = await saveReflectionAnswers(
        STEPS.map((s, i) => ({ content: answers[i], memory_type: s.type }))
      )
      setSaving(false)
      if (result.success) {
        setComplete(true)
      } else {
        setError(result.error ?? 'Failed to save. Please try again.')
      }
      return
    }

    setAnimating(true)
    setTimeout(() => {
      setStepIndex(i => i + 1)
      setAnimating(false)
    }, 160)
  }

  function handleBack() {
    if (stepIndex === 0 || animating) return
    setError(null)
    setAnimating(true)
    setTimeout(() => {
      setStepIndex(i => i - 1)
      setAnimating(false)
    }, 160)
  }

  if (complete) return <CompleteScreen />

  return (
    <div className="flex flex-col flex-1">
      {/* Step progress bar */}
      <div className="w-full h-0.5 bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 py-12 md:py-16">
        {/* Step dots */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < stepIndex
                  ? 'bg-fuchsia-400'
                  : i === stepIndex
                  ? 'bg-white/70 scale-125'
                  : 'bg-white/15'
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-white/25">
            {stepIndex + 1} of {STEPS.length}
          </span>
        </div>

        {/* Step content — fades + slides on transition */}
        <div
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(10px)' : 'translateY(0)',
            transition: 'opacity 0.16s ease, transform 0.16s ease',
          }}
          className="flex-1 flex flex-col"
        >
          {/* Category badge */}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border w-fit mb-6 ${step.badgeClass}`}
          >
            {step.badge}
          </span>

          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3 leading-snug">
            {step.question}
          </h2>
          <p className="text-sm text-white/40 mb-6">{step.hint}</p>

          <textarea
            value={answers[stepIndex]}
            onChange={e => setAnswer(e.target.value)}
            placeholder={step.placeholder}
            rows={4}
            autoFocus
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all mb-6 leading-relaxed"
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleNext()
            }}
          />

          {error && <p className="text-xs text-red-400/70 mb-4">{error}</p>}

          {/* Nav buttons */}
          <div className="flex items-center gap-3 mt-auto">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={animating || saving}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-30 transition-all"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext || animating || saving}
              className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:shadow-violet-500/35 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Saving…' : isLast ? 'Finish Reflection' : 'Continue'}
            </button>
            <span className="text-xs text-white/20 hidden sm:block">
              ⌘ Enter
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
