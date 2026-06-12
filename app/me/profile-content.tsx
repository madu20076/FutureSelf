import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import type { GeneratedProfile, ResponseStyle } from '@/lib/futureself/generate'
import type { OnboardingAnswers } from '@/app/actions/onboarding'
import type { Portrait } from '@/lib/futureself/portrait'
import { RegenerateButton } from './regenerate-button'
import { ProfileSettings } from './profile-settings'
import { ShareButton } from './share-button'
import { PortraitsSection } from './portraits-section'
import { VoiceSettings } from './voice-settings'
import { EditProfileForm } from './edit-profile'
import type { VoiceStyle } from '@/lib/futureself/voice'

type Props = {
  profile: GeneratedProfile
  answers: OnboardingAnswers
  storageOnly?: boolean
  username?: string | null
  isPublic?: boolean
  responseStyle?: ResponseStyle
  portraits?: Portrait[]
  hasReferencePhoto?: boolean
  voiceEnabled?: boolean
  voiceStyle?: VoiceStyle
  initialVoiceSample?: { audioUrl: string; duration: number | null } | null
}

function InfoCard({
  label,
  value,
  accent = 'violet',
}: {
  label: string
  value: string
  accent?: 'violet' | 'sky' | 'emerald' | 'fuchsia' | 'amber'
}) {
  const colors: Record<string, string> = {
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    fuchsia: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  }
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <p
        className={`inline-block text-xs font-semibold uppercase tracking-widest mb-3 px-2 py-0.5 rounded-full border ${colors[accent]}`}
      >
        {label}
      </p>
      <p className="text-white/70 text-sm leading-relaxed">{value || '—'}</p>
    </div>
  )
}

export function ProfileContent({
  profile,
  answers,
  storageOnly,
  username,
  isPublic,
  responseStyle,
  portraits,
  hasReferencePhoto,
  voiceEnabled,
  voiceStyle,
  initialVoiceSample,
}: Props) {
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
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard"
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Dashboard
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 md:px-8">

        {/* ── Hero ── */}
        <div className="mb-12 relative">
          {/* Glow */}
          <div
            className="absolute -top-16 left-0 w-64 h-64 bg-violet-700/15 rounded-full blur-[80px] pointer-events-none"
            aria-hidden
          />

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Foundation Built
          </div>

          {/* Name */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-1">
            {profile.display_name}
          </h1>
          <p className="text-white/30 text-sm mb-6">Your FutureSelf</p>

          {/* Personality summary */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400 mb-4">
              Personality Summary
            </p>
            <div className="space-y-5">
              {profile.personality_summary.split('\n\n').map((chunk, i) => {
                const nl = chunk.indexOf('\n')
                const label = nl !== -1 ? chunk.slice(0, nl) : null
                const text  = nl !== -1 ? chunk.slice(nl + 1) : chunk
                return (
                  <div key={i}>
                    {label && (
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1.5">
                        {label}
                      </p>
                    )}
                    <p className="text-white/80 leading-relaxed text-sm">{text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {!storageOnly && (
            <EditProfileForm profile={profile} username={username} />
          )}
        </div>

        {/* ── Profile grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <InfoCard
            label="Tone"
            value={profile.tone}
            accent="violet"
          />
          <InfoCard
            label="Topics to Avoid"
            value={profile.boundaries}
            accent="amber"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <InfoCard
            label="Biggest Goals"
            value={answers.biggestGoals}
            accent="sky"
          />
          <InfoCard
            label="Life Lessons"
            value={answers.lifeShapingLessons}
            accent="emerald"
          />
        </div>

        {/* Full-width: what to be remembered for */}
        <div className="mb-10">
          <InfoCard
            label="What I Want to Be Remembered For"
            value={answers.rememberFor}
            accent="fuchsia"
          />
        </div>

        {/* ── FutureSelf Status ── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/35 mb-4">
            FutureSelf Status
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-violet-400"
                >
                  <path d="M12 2a10 10 0 1 0 10 10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Foundation built
                </p>
                <p className="text-xs text-white/35">
                  Your identity layer is ready. AI activation coming in Phase 4.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
              </div>
              <span className="text-xs text-white/30">Phase 3 / 4</span>
            </div>
          </div>
        </div>

        {/* ── Future Portraits ── */}
        {!storageOnly && (
          <PortraitsSection
            initialPortraits={portraits ?? []}
            hasReferencePhoto={hasReferencePhoto ?? false}
          />
        )}

        {/* ── Voice Settings ── */}
        {!storageOnly && (
          <VoiceSettings
            initialEnabled={voiceEnabled ?? false}
            initialStyle={voiceStyle ?? 'female-calm'}
            initialVoiceSample={initialVoiceSample ?? null}
          />
        )}

        {/* ── Profile Settings ── */}
        {!storageOnly && (
          <ProfileSettings
            initialUsername={username ?? null}
            initialIsPublic={isPublic ?? false}
            initialResponseStyle={responseStyle ?? 'Balanced'}
          />
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all"
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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat With My FutureSelf
          </Link>
          <RegenerateButton storageOnly={storageOnly} />
          {username && isPublic && <ShareButton username={username} />}
          <Link
            href="/portraits"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white transition-all"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            View All Portraits
          </Link>
          <Link
            href="/memories"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white transition-all"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
            </svg>
            View Memories
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white transition-all"
          >
            Edit answers
          </Link>
          {storageOnly && (
            <p className="flex items-center text-xs text-amber-400/70 ml-1">
              Showing local data — add Supabase keys to persist to the cloud.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
