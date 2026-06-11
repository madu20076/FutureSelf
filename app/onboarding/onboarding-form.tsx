'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveOnboardingAction,
  type OnboardingAnswers,
} from '@/app/actions/onboarding'

const QUESTIONS: {
  id: keyof OnboardingAnswers
  label: string
  placeholder: string
}[] = [
  {
    id: 'name',
    label: 'What is your name?',
    placeholder:
      "Your full name, or whatever name you'd like your FutureSelf to go by...",
  },
  {
    id: 'friendsDescription',
    label: 'How would your friends describe you?',
    placeholder:
      "Think about what people closest to you always say — your energy, your presence, your quirks...",
  },
  {
    id: 'strongestBeliefs',
    label: 'What are your strongest beliefs?',
    placeholder:
      "Values you'd defend, worldviews you live by, principles that guide your decisions...",
  },
  {
    id: 'lifeShapingLessons',
    label: 'What life lessons have shaped you?',
    placeholder:
      "Experiences — good or hard — that changed how you see the world or who you are...",
  },
  {
    id: 'adviceGiven',
    label: 'What advice do you often give?',
    placeholder:
      "Things you find yourself repeating to friends, family, or people who ask for guidance...",
  },
  {
    id: 'biggestGoals',
    label: 'What are your biggest goals?',
    placeholder:
      "Dreams you're working toward, ambitions that drive you, things you want to build or become...",
  },
  {
    id: 'rememberFor',
    label: 'What do you want to be remembered for?',
    placeholder:
      "Your legacy — the mark you want to leave on the people and world around you...",
  },
  {
    id: 'tone',
    label: 'What tone should your FutureSelf use?',
    placeholder:
      "Warm and encouraging? Direct and honest? Philosophical? Funny? Describe the vibe...",
  },
  {
    id: 'avoidTopics',
    label: 'What topics should your AI avoid?',
    placeholder:
      "Sensitive areas, private matters, or subjects you'd prefer your FutureSelf to stay away from...",
  },
  {
    id: 'helpUnderstand',
    label: 'What should your FutureSelf help people understand about you?',
    placeholder:
      "The thing most people misread, the depth they miss, or the truth you most want to share...",
  },
]

const STORAGE_KEY = 'futureself_onboarding'
const DRAFT_KEY = 'futureself_onboarding_draft'

type Answers = Partial<OnboardingAnswers>

export function OnboardingForm() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()

  const current = QUESTIONS[step]
  const total = QUESTIONS.length
  const progressPct = (step / total) * 100
  const isFirst = step === 0
  const isLast = step === total - 1
  const currentAnswer = answers[current.id] ?? ''
  const canProceed = currentAnswer.trim().length > 0

  // Restore draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) setAnswers(JSON.parse(draft))
    } catch {
      // ignore
    }
  }, [])

  // Auto-save draft whenever answers change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(answers))
    } catch {
      // ignore
    }
  }, [answers])

  function handleChange(value: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
  }

  function handleNext() {
    if (!isLast) {
      setStep((s) => s + 1)
    } else {
      handleComplete()
    }
  }

  function handleBack() {
    if (!isFirst) setStep((s) => s - 1)
  }

  function handleComplete() {
    setSaveError(null)
    startTransition(async () => {
      const finalAnswers = answers as OnboardingAnswers

      // Always persist locally first so nothing is lost
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalAnswers))
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        // ignore
      }

      // Attempt to save to Supabase via Server Action
      const result = await saveOnboardingAction(finalAnswers)

      if (!result.saved && result.reason === 'db-error') {
        setSaveError(
          'Could not save to your profile, but your answers are stored locally. You can try again later.'
        )
        return
      }

      router.push('/me')
    })
  }

  return (
    <div className="min-h-screen bg-[#06060f] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-white/[0.05]">
        <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          FutureSelf
        </span>
        <span className="text-sm text-white/30">
          {step + 1} / {total}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/[0.05]">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-10">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i < step
                    ? 'bg-violet-500'
                    : i === step
                      ? 'bg-fuchsia-400'
                      : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Question */}
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-2">
            {current.label}
          </h2>
          <p className="text-sm text-white/35 mb-6">
            Be as detailed as you like — the more you share, the richer your FutureSelf.
          </p>

          {/* Answer textarea */}
          <textarea
            key={current.id}
            value={currentAnswer}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={current.placeholder}
            rows={5}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white placeholder-white/20 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition-colors resize-none text-base leading-relaxed"
          />

          {saveError && (
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
              {saveError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleBack}
              disabled={isFirst}
              className="text-sm text-white/35 hover:text-white/65 transition-colors disabled:opacity-0 disabled:pointer-events-none flex items-center gap-1.5"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed || isPending}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.03] transition-all duration-200 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isPending
                ? 'Saving…'
                : isLast
                  ? 'Complete'
                  : 'Next'}
              {!isPending && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
