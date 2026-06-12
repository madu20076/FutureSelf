'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { generateCommunicationAction } from '@/app/actions/communication'
import type { CommunicationProfile } from '@/lib/futureself/communication'

// ── Style cards config ────────────────────────────────────────────────────────

const STYLE_CARDS = [
  { key: 'communicationStyle', label: 'Communication Style', accent: 'text-violet-400', border: 'border-violet-500/15', bg: 'bg-violet-500/[0.04]', icon: '💬' },
  { key: 'decisionStyle',      label: 'Decision Style',      accent: 'text-sky-400',    border: 'border-sky-500/15',    bg: 'bg-sky-500/[0.04]',    icon: '⚖️' },
  { key: 'motivationStyle',    label: 'Motivation Style',    accent: 'text-emerald-400',border: 'border-emerald-500/15',bg: 'bg-emerald-500/[0.04]',icon: '🎯' },
  { key: 'leadershipStyle',    label: 'Leadership Style',    accent: 'text-fuchsia-400',border: 'border-fuchsia-500/15',bg: 'bg-fuchsia-500/[0.04]',icon: '🚀' },
  { key: 'planningStyle',      label: 'Planning Style',      accent: 'text-blue-400',   border: 'border-blue-500/15',   bg: 'bg-blue-500/[0.04]',   icon: '📋' },
  { key: 'riskTolerance',      label: 'Risk Tolerance',      accent: 'text-amber-400',  border: 'border-amber-500/15',  bg: 'bg-amber-500/[0.04]',  icon: '⚡' },
] as const

type StyleKey = typeof STYLE_CARDS[number]['key']

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  initialProfile: CommunicationProfile | null
  profileDate:    string | null
}

export function CommunicationView({ initialProfile, profileDate }: Props) {
  const [profile,  setProfile]  = useState<CommunicationProfile | null>(initialProfile)
  const [date,     setDate]     = useState<string | null>(profileDate)
  const [error,    setError]    = useState<string | null>(null)
  const [isGenning, startGen]   = useTransition()

  function handleGenerate() {
    setError(null)
    startGen(async () => {
      const result = await generateCommunicationAction()
      if (result.success) {
        setProfile(result.data)
        setDate(new Date().toISOString())
      } else {
        setError(result.error ?? 'Generation failed.')
      }
    })
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 md:px-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3.5 py-1 text-xs font-medium text-fuchsia-300 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
          Communication Profile
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-2">
          How You Communicate
        </h1>
        <p className="text-white/40 text-sm">
          Learned from your conversations, memories, and reflections. FutureSelf adapts to match your style.
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        {date && (
          <p className="text-xs text-white/25">
            Last analyzed{' '}
            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
        <button
          onClick={handleGenerate}
          disabled={isGenning}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/55 hover:border-fuchsia-500/40 hover:text-fuchsia-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isGenning ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-fuchsia-400 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
              </svg>
              {profile ? 'Re-analyze Style' : 'Analyze My Style'}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!profile && !isGenning && (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center mx-auto mb-4 text-2xl">
            💬
          </div>
          <p className="text-white/50 text-sm font-medium mb-1">No communication profile yet.</p>
          <p className="text-white/25 text-xs mb-5 max-w-xs mx-auto">
            Have a few conversations with your FutureSelf, then analyze your communication style.
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all"
          >
            Analyze My Communication Style
          </button>
        </div>
      )}

      {/* ── Skeleton ── */}
      {isGenning && (
        <div className="space-y-4 animate-pulse">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 h-24" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 h-24" />
            ))}
          </div>
        </div>
      )}

      {/* ── Profile ── */}
      {profile && !isGenning && (
        <div className="space-y-4">

          {/* Summary banner */}
          <div className="rounded-2xl bg-gradient-to-br from-fuchsia-900/30 via-violet-900/20 to-transparent border border-fuchsia-500/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400/70 mb-2">
              Style Summary
            </p>
            <p className="text-white/85 text-sm leading-relaxed">{profile.summary}</p>
          </div>

          {/* 6 style cards — 2-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STYLE_CARDS.map(card => (
              <div
                key={card.key}
                className={`rounded-2xl border ${card.border} ${card.bg} p-5`}
              >
                <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${card.accent}`}>
                  {card.label}
                </p>
                <p className="text-sm text-white/80 font-medium leading-snug">
                  {profile[card.key as StyleKey]}
                </p>
              </div>
            ))}
          </div>

          {/* Prompt injection note */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-start gap-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400 mt-0.5 flex-shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-white/30 leading-relaxed">
              This profile is automatically injected into every FutureSelf conversation so responses match your communication style.
              It updates after weekly reflections and coaching reports.
            </p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all"
            >
              Talk to FutureSelf
            </Link>
            <Link
              href="/coaching"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white transition-all"
            >
              View Coaching Report
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
