import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/actions/auth'
import { getUserPlan } from '@/lib/futureself/subscription'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Billing — FutureSelf',
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    'FutureSelf profile & personality',
    'Text chat with your FutureSelf',
    'Basic memory system',
    'Life Dashboard & Daily Focus',
    'Memory management & search',
  ],
  premium: [
    'Everything in Free',
    'Voice Conversation Mode',
    'Unlimited voice playback',
    'Weekly Reflection system',
    'Advanced Memory',
    'Talking Avatar',
    'Voice Cloning',
  ],
}

export default async function BillingPage() {
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

  const plan = await getUserPlan(user.id, supabase)
  const isPremium = plan === 'premium'
  const features = PLAN_FEATURES[plan]

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
          <Link href="/me" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            ← Profile
          </Link>
          <Link href="/pricing" className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block">
            Pricing
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16 md:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-2">
            Billing
          </h1>
          <p className="text-white/40 text-sm">Manage your FutureSelf subscription.</p>
        </div>

        {/* Current plan card */}
        <div className={`rounded-2xl border p-6 mb-6 ${
          isPremium
            ? 'border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-900/20 to-transparent'
            : 'border-white/[0.08] bg-white/[0.025]'
        }`}>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/35 mb-2">
                Current Plan
              </p>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border ${
                  isPremium
                    ? 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300'
                    : 'border-white/15 bg-white/[0.06] text-white/60'
                }`}>
                  {isPremium ? '★ Premium' : 'Free'}
                </span>
                {isPremium && (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    Active
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{isPremium ? '$—' : '$0'}</p>
              <p className="text-xs text-white/30">/ month</p>
            </div>
          </div>

          <ul className="space-y-2">
            {features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-fuchsia-400 flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Upgrade section (only shown for free users) */}
        {!isPremium && (
          <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-900/15 to-violet-900/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-fuchsia-400">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">Upgrade to Premium</p>
                  <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-px text-[10px] font-medium text-amber-300">
                    Coming Soon
                  </span>
                </div>
                <p className="text-xs text-white/40 mb-4 leading-relaxed">
                  Unlock Voice Conversation, Talking Avatar, Voice Cloning, Weekly Reflection, and Advanced Memory.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600/50 to-fuchsia-600/50 px-5 py-2 text-sm font-semibold text-white/50 cursor-not-allowed"
                  >
                    Join Waitlist
                  </button>
                  <Link
                    href="/pricing"
                    className="text-sm text-white/35 hover:text-white/60 transition-colors"
                  >
                    View pricing →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account info */}
        <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Account</p>
          <p className="text-sm text-white/50">{user.email}</p>
        </div>
      </main>
    </div>
  )
}
