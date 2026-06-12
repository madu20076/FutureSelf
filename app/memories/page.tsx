import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { MemoryList, type MemoryRow } from './memory-list'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Memories — FutureSelf',
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

  const list = memories ?? []

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
          <Link href="/chat" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            Chat
          </Link>
          <Link href="/me" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            ← Profile
          </Link>
        </div>
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
            Facts your FutureSelf has learned and will reference naturally in conversation.
            {list.length > 0 && (
              <span className="ml-1 text-white/25">
                {list.length} {list.length === 1 ? 'memory' : 'memories'}
              </span>
            )}
          </p>
        </div>

        {/* Empty state */}
        {list.length === 0 && (
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
            <p className="text-white/25 text-xs mb-6">
              Chat with your FutureSelf and click &ldquo;Remember&rdquo; on any response, or memories are
              automatically extracted from your conversations.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all"
            >
              Start a Chat
            </Link>
          </div>
        )}

        {/* Memory list with search + filter + edit */}
        {list.length > 0 && <MemoryList memories={list} />}
      </main>
    </div>
  )
}
