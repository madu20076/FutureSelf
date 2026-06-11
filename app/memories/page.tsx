import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { DeleteMemoryButton } from './delete-button'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Memories — FutureSelf',
}

const TYPE_LABELS: Record<string, string> = {
  goal: 'Goal',
  preference: 'Preference',
  belief: 'Belief',
  lesson: 'Lesson',
  decision: 'Decision',
  personal_fact: 'Personal Fact',
  communication_style: 'Comm. Style',
}

const TYPE_COLORS: Record<string, string> = {
  goal: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  preference: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  belief: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  lesson: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  decision: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  personal_fact: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  communication_style: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
}

function ImportanceDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            i < score ? 'bg-violet-400' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  )
}

type MemoryRow = {
  id: string
  memory_type: string
  content: string
  importance: number
  created_at: string
}

export default async function MemoriesPage() {
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

  const { data: memories } = await supabase
    .from('futureself_memories')
    .select('id, memory_type, content, importance, created_at')
    .eq('user_id', user.id)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<MemoryRow[]>()

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
          href="/me"
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          ← Back to Profile
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 md:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Memory System
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-2">
            Your Memories
          </h1>
          <p className="text-white/40 text-sm">
            Facts your FutureSelf has learned from your conversations.
          </p>
        </div>

        {/* Empty state */}
        {(!memories || memories.length === 0) && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-violet-400"
              >
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
              </svg>
            </div>
            <p className="text-white/50 text-sm mb-1">No memories yet</p>
            <p className="text-white/25 text-xs">
              Chat with your FutureSelf to start building memories.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 mt-6 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all"
            >
              Start a Chat
            </Link>
          </div>
        )}

        {/* Memory list */}
        {memories && memories.length > 0 && (
          <div className="space-y-3">
            {memories.map((m) => {
              const typeColor =
                TYPE_COLORS[m.memory_type] ??
                'text-white/50 bg-white/5 border-white/10'
              const typeLabel =
                TYPE_LABELS[m.memory_type] ?? m.memory_type

              const date = new Date(m.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })

              return (
                <div
                  key={m.id}
                  className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`inline-block text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeColor}`}
                      >
                        {typeLabel}
                      </span>
                      <ImportanceDots score={m.importance} />
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed">{m.content}</p>
                    <p className="text-white/25 text-xs mt-2">{date}</p>
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteMemoryButton memoryId={m.id} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
