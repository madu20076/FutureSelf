'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { generateFutureSelfProfile, type GeneratedProfile } from '@/lib/futureself/generate'
import { buildSystemPrompt } from '@/lib/futureself/prompt'
import { ChatInterface } from './chat-interface'
import type { OnboardingAnswers } from '@/app/actions/onboarding'

export function ChatViewLocal() {
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<GeneratedProfile | null>(null)
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('futureself_onboarding')
      if (raw) {
        const parsed: OnboardingAnswers = JSON.parse(raw)
        const generated = generateFutureSelfProfile(parsed)
        setAnswers(parsed)
        setProfile(generated)
        setSystemPrompt(buildSystemPrompt(generated, parsed))
      }
    } catch {
      // ignore
    }
    setReady(true)
  }, [])

  if (!ready) return null

  if (!profile || !answers) {
    return (
      <div className="min-h-screen bg-[#06060f] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white/40 text-sm mb-4">No FutureSelf profile found.</p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white hover:scale-[1.03] transition-transform"
          >
            Start onboarding
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ChatInterface
      profile={profile}
      answers={answers}
      userId={null}
      systemPrompt={systemPrompt}
    />
  )
}
