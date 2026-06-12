import Link from 'next/link'
import type { CommunicationProfile } from '@/lib/futureself/communication'

type Props = {
  profile: CommunicationProfile | null
}

export function CommunicationWidget({ profile }: Props) {
  return (
    <div className="rounded-2xl border border-fuchsia-500/10 bg-gradient-to-br from-fuchsia-900/[0.08] to-transparent p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-fuchsia-400 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-white/85">Communication Profile</h2>
        </div>
        <Link
          href="/communication"
          className="text-xs text-fuchsia-400/60 hover:text-fuchsia-400 transition-colors flex-shrink-0"
        >
          {profile ? 'View profile →' : 'Analyze style →'}
        </Link>
      </div>

      {profile ? (
        <div className="space-y-2">
          {/* Three key traits */}
          {[
            { label: 'Communication', value: profile.communicationStyle },
            { label: 'Decisions',     value: profile.decisionStyle },
            { label: 'Motivation',    value: profile.motivationStyle },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25 w-24 flex-shrink-0">
                {label}
              </span>
              <span className="text-xs text-white/60 truncate">{value}</span>
            </div>
          ))}
          <div className="pt-1">
            <Link
              href="/communication"
              className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/[0.07] px-2.5 py-1 text-xs font-medium text-fuchsia-400 hover:bg-fuchsia-500/15 transition-colors"
            >
              View Full Profile
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-white/35 mb-3">
            FutureSelf will learn your communication style and adapt every response to match.
          </p>
          <Link
            href="/communication"
            className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-600/20 border border-fuchsia-500/25 px-4 py-2 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-600/30 transition-colors"
          >
            Analyze My Style
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
