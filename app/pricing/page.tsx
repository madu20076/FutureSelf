import Link from 'next/link'

export const metadata = {
  title: 'Pricing — FutureSelf',
}

const FREE_FEATURES = [
  'FutureSelf profile & personality',
  'Text chat with your FutureSelf',
  'Basic memory system (auto-extracted)',
  'Life Dashboard',
  'Daily Focus (AI-generated)',
  'Memory management & search',
]

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Voice Conversation Mode',
  'Unlimited voice playback',
  'Weekly Reflection system',
  'Advanced Memory (priority memories)',
  'Talking Avatar',
  'Voice Cloning',
]

function CheckIcon({ dim }: { dim?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={dim ? 'text-white/25' : 'text-fuchsia-400 flex-shrink-0'}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function PricingPage() {
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
          <Link href="/login" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-sm font-semibold text-white hover:scale-[1.03] transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16 md:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Simple Pricing
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-4">
            Start free. Unlock the full experience.
          </h1>
          <p className="text-white/40 text-base max-w-lg mx-auto">
            Build your FutureSelf for free. Premium unlocks voice, avatar, and deeper memory — everything your future self needs to guide you.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Free tier */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8">
            <div className="mb-6">
              <span className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/50 mb-4">
                Free
              </span>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-white/35 text-sm pb-1">/ month</span>
              </div>
              <p className="text-white/40 text-sm mt-2">Everything you need to start.</p>
            </div>

            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="block w-full text-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/[0.05] hover:text-white/80 transition-all"
            >
              Get Started Free
            </Link>
          </div>

          {/* Premium tier */}
          <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-b from-fuchsia-900/20 to-violet-900/10 p-8 relative overflow-hidden">
            {/* Glow */}
            <div
              className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-600/15 rounded-full blur-[60px] pointer-events-none"
              aria-hidden
            />

            <div className="mb-6 relative">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 border border-fuchsia-500/40 px-3 py-1 text-xs font-semibold text-fuchsia-300">
                  ★ Premium
                </span>
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                  Coming Soon
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-white/50">$—</span>
                <span className="text-white/25 text-sm pb-1">/ month</span>
              </div>
              <p className="text-white/40 text-sm mt-2">The full FutureSelf experience.</p>
            </div>

            <ul className="space-y-3 mb-8 relative">
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={f} className={`flex items-start gap-2.5 text-sm ${i === 0 ? 'text-white/40' : 'text-white/75'}`}>
                  <CheckIcon dim={i === 0} />
                  {f}
                  {(f.includes('Avatar') || f.includes('Cloning')) && (
                    <span className="ml-1 rounded-full bg-white/[0.06] border border-white/10 px-1.5 py-px text-[10px] text-white/35 font-medium">
                      Soon
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled
              className="w-full rounded-full bg-gradient-to-r from-violet-600/50 to-fuchsia-600/50 px-5 py-2.5 text-sm font-semibold text-white/50 cursor-not-allowed"
            >
              Join Waitlist — Coming Soon
            </button>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-white/25 mt-10">
          Premium features are in development. Free features will always remain free.{' '}
          <Link href="/billing" className="underline underline-offset-2 hover:text-white/45 transition-colors">
            Billing
          </Link>
        </p>
      </main>
    </div>
  )
}
