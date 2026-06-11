import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { getPortraits } from '@/lib/futureself/portrait'
import { PORTRAIT_TYPE_LABELS, type PortraitType } from '@/lib/futureself/portrait-prompt'
import { PortraitGalleryCard } from './portrait-card'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Future Portraits — FutureSelf',
}

export default async function PortraitsPage() {
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

  const portraits = await getPortraits(user.id, supabase)

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

      <main className="max-w-4xl mx-auto px-6 py-16 md:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Future Portraits
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-2">
            Your Portraits
          </h1>
          <p className="text-white/40 text-sm">Visual glimpses of your possible futures.</p>
        </div>

        {/* Empty state */}
        {portraits.length === 0 && (
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
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="text-white/50 text-sm mb-1">No portraits yet</p>
            <p className="text-white/25 text-xs mb-6">
              Generate your first portrait from your profile page.
            </p>
            <Link
              href="/me"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all"
            >
              Go to Profile
            </Link>
          </div>
        )}

        {/* Gallery */}
        {portraits.length > 0 && (
          <>
            <p className="text-xs text-white/25 mb-4">{portraits.length} portrait{portraits.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {portraits.map((portrait) => (
                <PortraitGalleryCard
                  key={portrait.id}
                  portrait={portrait}
                />
              ))}
            </div>

            {/* Type legend */}
            <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-3">
                Portrait Types
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.entries(PORTRAIT_TYPE_LABELS) as [PortraitType, string][]).map(
                  ([type, label]) => (
                    <div key={type} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400/50 flex-shrink-0" />
                      <span className="text-xs text-white/40">{label}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
