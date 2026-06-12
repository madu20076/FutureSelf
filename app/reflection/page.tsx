import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/actions/auth'
import { ReflectionFlow } from './reflection-flow'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Weekly Reflection — FutureSelf',
}

function getISOWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default async function ReflectionPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="min-h-screen bg-[#06060f] text-white flex items-center justify-center">
        <p className="text-white/40">Supabase not configured.</p>
      </div>
    )
  }

  const supabase = await createAuthenticatedClient()
  if (!supabase) redirect('/login')

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  const weekStart = getISOWeekStart()
  const { data: existing } = await supabase
    .from('futureself_memories')
    .select('id')
    .eq('user_id', user.id)
    .eq('source', 'weekly_reflection')
    .gte('created_at', `${weekStart}T00:00:00.000Z`)
    .limit(1)
    .returns<{ id: string }[]>()

  const alreadyDone = (existing?.length ?? 0) > 0

  return (
    <div className="min-h-[100dvh] bg-[#06060f] text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-16 border-b border-white/[0.06] flex-shrink-0">
        <Link
          href="/"
          className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
        >
          FutureSelf
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard"
            className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block"
          >
            Dashboard
          </Link>
          <Link
            href="/chat"
            className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block"
          >
            Chat
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Already complete */}
      {alreadyDone ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-6">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">All caught up!</h2>
          <p className="text-white/40 text-sm max-w-xs leading-relaxed mb-8">
            You&apos;ve already completed this week&apos;s reflection. Come back on Friday to reflect on the next week.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all"
            >
              View Dashboard
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.05] hover:text-white/80 transition-all"
            >
              Talk to FutureSelf
            </Link>
          </div>
        </div>
      ) : (
        <ReflectionFlow />
      )}
    </div>
  )
}
