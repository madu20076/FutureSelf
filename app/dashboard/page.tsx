import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/actions/auth'
import { QuickAddSection } from './quick-add'
import { FocusCard } from './focus-card'
import type { FocusRow } from '@/app/actions/focus'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard — FutureSelf',
}

type MemoryRow = {
  id: string
  memory_type: string
  content: string
  importance: number
  created_at: string
}

type SectionDef = {
  id: string
  title: string
  types: string[]
  emptyText: string
  emptyHint: string
  dotFill: string
  badgeBg: string
  badgeBorder: string
  badgeText: string
}

const SECTIONS: SectionDef[] = [
  {
    id: 'goal',
    title: 'Current Goals',
    types: ['goal'],
    emptyText: 'No goals tracked yet.',
    emptyHint: "Tell your FutureSelf what you're working toward.",
    dotFill: 'bg-violet-400',
    badgeBg: 'bg-violet-500/10',
    badgeBorder: 'border-violet-500/25',
    badgeText: 'text-violet-300',
  },
  {
    id: 'project',
    title: 'Active Projects',
    types: ['project'],
    emptyText: 'No projects tracked yet.',
    emptyHint: "Add a project you're currently building or working on.",
    dotFill: 'bg-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/25',
    badgeText: 'text-blue-300',
  },
  {
    id: 'challenge',
    title: 'Current Challenges',
    types: ['challenge'],
    emptyText: 'No challenges tracked yet.',
    emptyHint: 'Sharing your challenges helps your FutureSelf offer better guidance.',
    dotFill: 'bg-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/25',
    badgeText: 'text-amber-300',
  },
  {
    id: 'win',
    title: 'Recent Wins',
    types: ['win'],
    emptyText: 'No wins recorded yet.',
    emptyHint: 'Celebrate your wins — big and small.',
    dotFill: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/25',
    badgeText: 'text-emerald-300',
  },
  {
    id: 'relationship',
    title: 'Key Relationships',
    types: ['relationship'],
    emptyText: 'No relationships tracked yet.',
    emptyHint: 'Tell your FutureSelf about the important people in your life.',
    dotFill: 'bg-pink-400',
    badgeBg: 'bg-pink-500/10',
    badgeBorder: 'border-pink-500/25',
    badgeText: 'text-pink-300',
  },
  {
    id: 'focus',
    title: 'Focus Areas',
    types: ['preference', 'belief', 'lesson', 'decision', 'personal_fact', 'communication_style'],
    emptyText: 'No focus areas yet.',
    emptyHint: 'Beliefs, lessons, and preferences your FutureSelf should know.',
    dotFill: 'bg-sky-400',
    badgeBg: 'bg-sky-500/10',
    badgeBorder: 'border-sky-500/25',
    badgeText: 'text-sky-300',
  },
]

function ImportanceDots({ score, fill }: { score: number; fill: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < score ? fill : 'bg-white/[0.1]'}`}
        />
      ))}
    </span>
  )
}

function MemoryCard({ item, dotFill }: { item: MemoryRow; dotFill: string }) {
  const date = new Date(item.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 flex flex-col gap-3">
      <p className="text-sm text-white/75 leading-relaxed flex-1">{item.content}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/20">{date}</span>
        <ImportanceDots score={item.importance} fill={dotFill} />
      </div>
    </div>
  )
}

function Section({ def, items }: { def: SectionDef; items: MemoryRow[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${def.dotFill}`} />
          <h2 className="text-sm font-semibold text-white/85">{def.title}</h2>
          {items.length > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${def.badgeBg} ${def.badgeBorder} ${def.badgeText}`}
            >
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <Link
            href="/memories"
            className="text-xs text-white/25 hover:text-white/55 transition-colors"
          >
            View all
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-5 text-center">
          <p className="text-sm text-white/30 mb-1">{def.emptyText}</p>
          <p className="text-xs text-white/20">{def.emptyHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <MemoryCard key={item.id} item={item} dotFill={def.dotFill} />
          ))}
        </div>
      )}
    </div>
  )
}

function getISOWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default async function DashboardPage() {
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

  const today       = new Date().toISOString().slice(0, 10)
  const dayOfWeek   = new Date().getDay()
  const isReflectionDay = [0, 5, 6].includes(dayOfWeek)
  const weekStart   = getISOWeekStart()

  const [{ data: memories }, { data: focusItems }, { data: reflectionCheck }] = await Promise.all([
    supabase
      .from('futureself_memories')
      .select('id, memory_type, content, importance, created_at')
      .eq('user_id', user.id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .returns<MemoryRow[]>(),
    supabase
      .from('futureself_focus')
      .select('id, focus_text, completed, focus_date, created_at')
      .eq('user_id', user.id)
      .eq('focus_date', today)
      .order('created_at', { ascending: true })
      .returns<FocusRow[]>(),
    supabase
      .from('futureself_memories')
      .select('id')
      .eq('user_id', user.id)
      .eq('source', 'weekly_reflection')
      .gte('created_at', `${weekStart}T00:00:00.000Z`)
      .limit(1)
      .returns<{ id: string }[]>(),
  ])

  const all = memories ?? []
  const reflectionDoneThisWeek = (reflectionCheck?.length ?? 0) > 0

  const grouped = Object.fromEntries(
    SECTIONS.map((s) => [s.id, all.filter((m) => s.types.includes(m.memory_type))])
  )

  const counts = {
    goals:      grouped['goal']?.length ?? 0,
    projects:   grouped['project']?.length ?? 0,
    challenges: grouped['challenge']?.length ?? 0,
    wins:       grouped['win']?.length ?? 0,
  }

  const trackingParts: string[] = []
  if (counts.goals > 0)      trackingParts.push(`${counts.goals} ${counts.goals === 1 ? 'goal' : 'goals'}`)
  if (counts.projects > 0)   trackingParts.push(`${counts.projects} ${counts.projects === 1 ? 'project' : 'projects'}`)
  if (counts.challenges > 0) trackingParts.push(`${counts.challenges} ${counts.challenges === 1 ? 'challenge' : 'challenges'}`)
  if (counts.wins > 0)       trackingParts.push(`${counts.wins} ${counts.wins === 1 ? 'win' : 'wins'}`)

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
            <Link
              href="/chat"
              className="rounded-full px-3 py-1 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
            >
              Chat
            </Link>
            <Link
              href="/conversation"
              className="rounded-full px-3 py-1 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
            >
              Conversation
            </Link>
          </div>
          <Link
            href="/reflection"
            className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block"
          >
            Reflect
          </Link>
          <Link
            href="/me"
            className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block"
          >
            Profile
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

      <main className="max-w-3xl mx-auto px-6 py-12 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Life Dashboard
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-2">
            Your Life, At a Glance
          </h1>
          <p className="text-white/40 text-sm">
            Everything your FutureSelf is tracking about you.
          </p>
        </div>

        {/* Weekly reflection banner — shown Fri / Sat / Sun */}
        {isReflectionDay && (
          <div
            className={`rounded-2xl border p-4 mb-6 flex items-center justify-between gap-4 flex-wrap ${
              reflectionDoneThisWeek
                ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                : 'border-amber-500/20 bg-amber-500/[0.06]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  reflectionDoneThisWeek ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                }`}
              >
                {reflectionDoneThisWeek ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                )}
              </span>
              <div>
                <p className={`text-sm font-medium ${reflectionDoneThisWeek ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {reflectionDoneThisWeek ? 'Weekly Reflection Complete' : 'Time for your weekly review'}
                </p>
                {!reflectionDoneThisWeek && (
                  <p className="text-xs text-white/30 mt-0.5">Take 5 minutes to reflect on the week.</p>
                )}
              </div>
            </div>
            {!reflectionDoneThisWeek && (
              <Link
                href="/reflection"
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-all"
              >
                Start Reflection
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            )}
          </div>
        )}

        {/* Tracking summary */}
        {trackingParts.length > 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 p-5 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-violet-400"
              >
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
              </svg>
            </div>
            <p className="text-sm text-white/65">
              Your FutureSelf is currently tracking{' '}
              <span className="text-white/88 font-medium">{trackingParts.join(', ')}.</span>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-5 mb-6 text-center">
            <p className="text-sm text-white/30 mb-1">Nothing tracked yet.</p>
            <p className="text-xs text-white/20">
              Use Quick Add below or start chatting — memories are extracted automatically.
            </p>
          </div>
        )}

        {/* Today's Focus */}
        <FocusCard initialItems={focusItems ?? []} />

        {/* Quick add */}
        <QuickAddSection />

        {/* Memory sections */}
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <Section key={s.id} def={s} items={grouped[s.id] ?? []} />
          ))}
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-white/20 mt-10">
          Memories are auto-extracted from every chat.{' '}
          <Link href="/memories" className="underline underline-offset-2 hover:text-white/40 transition-colors">
            Manage all memories
          </Link>
        </p>
      </main>
    </div>
  )
}
