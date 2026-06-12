'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { generateCoachingAction } from '@/app/actions/coaching'
import type { CoachingReport } from '@/lib/futureself/coaching'

// ── Momentum helpers ──────────────────────────────────────────────────────────

function momentumColor(score: number) {
  if (score >= 8) return { ring: 'border-emerald-400/60', text: 'text-emerald-400', bg: 'bg-emerald-400/10', badge: 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400' }
  if (score >= 5) return { ring: 'border-amber-400/60',  text: 'text-amber-400',  bg: 'bg-amber-400/10',  badge: 'border-amber-500/25 bg-amber-500/[0.07] text-amber-300' }
  return           { ring: 'border-red-400/60',    text: 'text-red-400',    bg: 'bg-red-400/10',    badge: 'border-red-500/25 bg-red-500/[0.07] text-red-400' }
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  label, accent, children,
}: {
  label:    string
  accent:   string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${accent}`}>{label}</p>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  initialReport: CoachingReport | null
  reportDate:    string | null
}

export function CoachingView({ initialReport, reportDate }: Props) {
  const [report,    setReport]    = useState<CoachingReport | null>(initialReport)
  const [date,      setDate]      = useState<string | null>(reportDate)
  const [error,     setError]     = useState<string | null>(null)
  const [isGenning, startGenning] = useTransition()

  function handleGenerate() {
    setError(null)
    startGenning(async () => {
      const result = await generateCoachingAction()
      if (result.success) {
        setReport(result.data)
        setDate(new Date().toISOString())
      } else {
        setError(result.error ?? 'Generation failed.')
      }
    })
  }

  const mColor = report ? momentumColor(report.momentumScore) : null

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 md:px-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          AI Coaching Engine
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-2">
          Your Coaching Report
        </h1>
        <p className="text-white/40 text-sm">
          Personalized insights from your goals, reflections, and daily focus.
        </p>
      </div>

      {/* ── Generate / Regenerate controls ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        {date && (
          <p className="text-xs text-white/25">
            Last generated{' '}
            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
        <button
          onClick={handleGenerate}
          disabled={isGenning}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/55 hover:border-violet-500/40 hover:text-violet-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isGenning ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-violet-400 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
              </svg>
              {report ? 'Regenerate Report' : 'Generate My Report'}
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
      {!report && !isGenning && (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-white/50 text-sm font-medium mb-1">No coaching report yet.</p>
          <p className="text-white/25 text-xs mb-5 max-w-xs mx-auto">
            Generate your first personalized report based on your goals, reflections, and focus history.
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all"
          >
            Generate My Report
          </button>
        </div>
      )}

      {/* ── Generating skeleton ── */}
      {isGenning && (
        <div className="space-y-4 animate-pulse">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 h-28" />
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 h-36" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 h-32" />
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 h-32" />
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 h-28" />
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 h-32" />
        </div>
      )}

      {/* ── Report ── */}
      {report && !isGenning && (
        <div className="space-y-4">

          {/* Summary banner */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-900/40 via-fuchsia-900/20 to-transparent border border-violet-500/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/70 mb-2">
              AI Summary
            </p>
            <p className="text-white/85 text-sm leading-relaxed font-medium">
              {report.summary}
            </p>
          </div>

          {/* Momentum score — full width */}
          <div className={`rounded-2xl border ${mColor!.ring} bg-white/[0.025] p-6 flex items-center gap-6`}>
            <div className={`w-20 h-20 rounded-full border-4 ${mColor!.ring} flex items-center justify-center flex-shrink-0`}>
              <span className={`text-3xl font-bold tabular-nums ${mColor!.text}`}>
                {report.momentumScore}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1">
                Momentum Score
              </p>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${mColor!.badge}`}>
                {report.momentumLabel}
              </span>
              <p className="text-xs text-white/30 mt-2">out of 10</p>
            </div>
          </div>

          {/* Opportunity + Risk — 2-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SectionCard label="A · Biggest Opportunity" accent="text-violet-400">
              <p className="text-sm text-white/75 leading-relaxed">{report.biggestOpportunity}</p>
            </SectionCard>
            <SectionCard label="B · Biggest Risk" accent="text-amber-400">
              <p className="text-sm text-white/75 leading-relaxed">{report.biggestRisk}</p>
            </SectionCard>
          </div>

          {/* Recommended Focus */}
          <SectionCard label="D · Recommended Focus" accent="text-sky-400">
            <p className="text-sm text-white/75 leading-relaxed">{report.recommendedFocus}</p>
          </SectionCard>

          {/* FutureSelf Advice */}
          <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-900/15 to-transparent p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400/70 mb-3">
              E · FutureSelf Advice
            </p>
            <blockquote className="border-l-2 border-fuchsia-500/40 pl-4">
              <p className="text-sm text-white/80 leading-relaxed italic">
                &ldquo;{report.futureSelfAdvice}&rdquo;
              </p>
            </blockquote>
          </div>

          {/* Actions footer */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all"
            >
              Talk to FutureSelf
            </Link>
            <Link
              href="/reflection"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white transition-all"
            >
              Weekly Reflection
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
