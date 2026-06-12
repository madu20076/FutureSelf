import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/actions/auth'
import { CommunicationView } from './communication-view'
import type { CommunicationProfile } from '@/lib/futureself/communication'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Communication Profile — FutureSelf',
}

type ProfileRow = {
  communication_style: string | null
  decision_style:      string | null
  motivation_style:    string | null
  leadership_style:    string | null
  planning_style:      string | null
  risk_tolerance:      string | null
  summary:             string | null
  updated_at:          string
}

export default async function CommunicationPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="min-h-screen bg-[#06060f] text-white flex items-center justify-center">
        <p className="text-white/40">Supabase not configured.</p>
      </div>
    )
  }

  const supabase = await createAuthenticatedClient()
  if (!supabase) redirect('/login')

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  const { data: row } = await supabase
    .from('futureself_communication_profile')
    .select('communication_style, decision_style, motivation_style, leadership_style, planning_style, risk_tolerance, summary, updated_at')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRow>()

  const profile: CommunicationProfile | null = row ? {
    communicationStyle: row.communication_style ?? '',
    decisionStyle:      row.decision_style      ?? '',
    motivationStyle:    row.motivation_style    ?? '',
    leadershipStyle:    row.leadership_style    ?? '',
    planningStyle:      row.planning_style      ?? '',
    riskTolerance:      row.risk_tolerance      ?? '',
    summary:            row.summary             ?? '',
    updatedAt:          row.updated_at,
  } : null

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-0.5">
            <Link href="/chat" className="rounded-full px-3 py-1 text-xs font-medium text-white/40 hover:text-white/70 transition-colors">
              Chat
            </Link>
            <Link href="/conversation" className="rounded-full px-3 py-1 text-xs font-medium text-white/40 hover:text-white/70 transition-colors">
              Conversation
            </Link>
          </div>
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block">Dashboard</Link>
          <Link href="/coaching" className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block">Coaching</Link>
          <span className="text-sm font-medium text-fuchsia-400 hidden sm:block">Style</span>
          <Link href="/reflection" className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block">Reflect</Link>
          <Link href="/me" className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block">Profile</Link>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <CommunicationView initialProfile={profile} profileDate={row?.updated_at ?? null} />
    </div>
  )
}
