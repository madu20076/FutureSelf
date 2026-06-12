import Link from 'next/link'
import type { CoachingReport } from '@/lib/futureself/coaching'

function momentumColor(score: number) {
  if (score >= 8) return 'text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.07]'
  if (score >= 5) return 'text-amber-400 border-amber-500/25 bg-amber-500/[0.07]'
  return 'text-red-400 border-red-500/25 bg-red-500/[0.07]'
}

type Props = {
  report: CoachingReport | null
}

export function CoachingWidget({ report }: Props) {
  return (
    <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-900/10 to-transparent p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-white/85">AI Coaching</h2>
        </div>
        <Link
          href="/coaching"
          className="text-xs text-violet-400/60 hover:text-violet-400 transition-colors flex-shrink-0"
        >
          {report ? 'View full report →' : 'Get coached →'}
        </Link>
      </div>

      {report ? (
        <div className="space-y-3">
          {/* Summary */}
          <p className="text-sm text-white/60 leading-relaxed">{report.summary}</p>

          {/* Momentum badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${momentumColor(report.momentumScore)}`}>
              <span className="tabular-nums">{report.momentumScore}/10</span>
              <span>·</span>
              {report.momentumLabel}
            </span>
            <Link
              href="/coaching"
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/[0.07] px-2.5 py-1 text-xs font-medium text-violet-400 hover:bg-violet-500/15 transition-colors"
            >
              View Full Coaching
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-white/35 mb-3">
            Get a personalized coaching report based on your goals, reflections, and focus.
          </p>
          <Link
            href="/coaching"
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/20 border border-violet-500/25 px-4 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-600/30 transition-colors"
          >
            Get My Coaching Report
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
