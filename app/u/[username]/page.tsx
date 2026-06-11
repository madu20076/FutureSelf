import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { PublicChatInterface } from './public-chat-interface'
import { buildSystemPrompt } from '@/lib/futureself/prompt'
import type { OnboardingAnswers } from '@/app/actions/onboarding'
import type { GeneratedProfile } from '@/lib/futureself/generate'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ username: string }> }

function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <PrivateProfile />
  }

  const supabase = getAnonClient()

  const { data: row } = await supabase
    .from('futureself_profiles')
    .select(
      'id, display_name, personality_summary, tone, boundaries, onboarding, is_public, username, response_style'
    )
    .eq('username', username)
    .single()

  if (!row || !row.is_public) {
    return <PrivateProfile />
  }

  const profile: GeneratedProfile = {
    display_name: row.display_name ?? username,
    personality_summary: row.personality_summary ?? '',
    tone: row.tone ?? '',
    boundaries: row.boundaries ?? '',
    response_style: (row.response_style as GeneratedProfile['response_style']) ?? 'Balanced',
  }

  const systemPrompt = row.onboarding
    ? buildSystemPrompt(profile, row.onboarding as OnboardingAnswers)
    : `You are ${profile.display_name}'s FutureSelf. Speak in first person as a wiser, future version of ${profile.display_name}.`

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
        <Link
          href="/signup"
          className="hidden md:inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          Create yours →
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 md:px-8">
        {/* Glow */}
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-700/10 rounded-full blur-[100px] pointer-events-none"
          aria-hidden
        />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          FutureSelf Profile
        </div>

        {/* Identity */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-1">
          {profile.display_name}
        </h1>
        <p className="text-white/30 text-sm mb-10">@{username}</p>

        {/* Personality sections */}
        <div className="space-y-4 mb-12">
          {profile.personality_summary.split('\n\n').map((chunk, i) => {
            const nl = chunk.indexOf('\n')
            const label = nl !== -1 ? chunk.slice(0, nl) : null
            const text = nl !== -1 ? chunk.slice(nl + 1) : chunk
            if (!text.trim()) return null
            return (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
              >
                {label && (
                  <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400/80 mb-2">
                    {label}
                  </p>
                )}
                <p className="text-white/80 leading-relaxed text-sm">{text}</p>
              </div>
            )
          })}
        </div>

        {/* Chat */}
        <PublicChatInterface
          profileId={row.id}
          displayName={profile.display_name}
          systemPrompt={systemPrompt}
        />

        {/* Footer CTA */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <p className="text-white/30 text-sm mb-3">
            Want to build your own FutureSelf?
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] transition-all"
          >
            Create My FutureSelf
          </Link>
        </div>
      </main>
    </div>
  )
}

function PrivateProfile() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 md:px-16 border-b border-white/[0.06]">
        <Link
          href="/"
          className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
        >
          FutureSelf
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/30"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            This FutureSelf profile is private.
          </h2>
          <p className="text-white/35 text-sm mb-6">
            The owner hasn&apos;t made their FutureSelf public yet.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white hover:scale-[1.03] transition-transform"
          >
            Create your own FutureSelf
          </Link>
        </div>
      </div>
    </div>
  )
}
