'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import type { OnboardingAnswers } from '@/app/actions/onboarding'

const QUESTION_LABELS: Record<keyof OnboardingAnswers, string> = {
  name: 'Name',
  friendsDescription: 'How friends describe you',
  strongestBeliefs: 'Strongest beliefs',
  lifeShapingLessons: 'Life-shaping lessons',
  adviceGiven: 'Advice you often give',
  biggestGoals: 'Biggest goals',
  rememberFor: 'What you want to be remembered for',
  tone: 'Tone of your FutureSelf',
  avoidTopics: 'Topics to avoid',
  helpUnderstand: 'What people should understand about you',
}

export default function DashboardPage() {
  const [onboarding, setOnboarding] = useState<Partial<OnboardingAnswers> | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('futureself_onboarding')
      if (raw) setOnboarding(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

  const name = onboarding?.name ?? 'there'

  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-16 border-b border-white/[0.06]">
        <Link
          href="/"
          className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
        >
          FutureSelf
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Sign out
          </button>
        </form>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 md:px-8">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Phase 3 complete
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Welcome, {name}.
          </h1>
          <p className="text-white/45 text-lg mb-6">
            Your FutureSelf is taking shape. AI chat is coming in Phase 4.
          </p>
          <Link
            href="/me"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.03] transition-all duration-200"
          >
            View my FutureSelf
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        {/* Coming soon card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 mb-10 relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 rounded-2xl"
            aria-hidden
          />
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white mb-1">
                AI Chat — coming in Phase 3
              </h2>
              <p className="text-sm text-white/40 leading-relaxed">
                Your onboarding answers have been recorded. Next we'll train your
                FutureSelf on them and let you (and others) chat with it.
              </p>
            </div>
          </div>
        </div>

        {/* Onboarding answers recap */}
        {onboarding && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-5">
              Your FutureSelf foundation
            </h2>
            <div className="space-y-4">
              {(Object.keys(QUESTION_LABELS) as (keyof OnboardingAnswers)[]).map(
                (key) => {
                  const answer = onboarding[key]
                  if (!answer) return null
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4"
                    >
                      <p className="text-xs font-medium text-white/35 uppercase tracking-wider mb-1.5">
                        {QUESTION_LABELS[key]}
                      </p>
                      <p className="text-sm text-white/70 leading-relaxed">
                        {answer}
                      </p>
                    </div>
                  )
                }
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200"
              >
                Edit answers
              </Link>
            </div>
          </div>
        )}

        {!onboarding && (
          <div className="text-center py-10">
            <p className="text-white/35 text-sm mb-4">
              No onboarding answers found.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white hover:scale-[1.03] transition-transform"
            >
              Start onboarding
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
