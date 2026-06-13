import Link from 'next/link'

type Props = {
  hasMemories:    boolean
  hasVoiceSample: boolean
  hasCoaching:    boolean
  hasReflection:  boolean
}

type Item = {
  label:    string
  done:     boolean
  href:     string
  hintDone: string
  hintTodo: string
}

export function OnboardingChecklist({
  hasMemories,
  hasVoiceSample,
  hasCoaching,
  hasReflection,
}: Props) {
  const items: Item[] = [
    {
      label:    'Complete Profile',
      done:     true,
      href:     '/me',
      hintDone: 'Profile is set up',
      hintTodo: 'Finish your profile',
    },
    {
      label:    'Add Memories',
      done:     hasMemories,
      href:     '/chat',
      hintDone: 'Memories are being tracked',
      hintTodo: 'Chat with your FutureSelf to build memories',
    },
    {
      label:    'Record Voice',
      done:     hasVoiceSample,
      href:     '/me',
      hintDone: 'Voice sample recorded',
      hintTodo: 'Record a voice sample in Profile settings',
    },
    {
      label:    'Generate Coaching',
      done:     hasCoaching,
      href:     '/coaching',
      hintDone: 'Coaching report generated',
      hintTodo: 'Generate your first coaching report',
    },
    {
      label:    'Complete Reflection',
      done:     hasReflection,
      href:     '/reflection',
      hintDone: 'Weekly reflection completed',
      hintTodo: 'Complete your first weekly reflection',
    },
  ]

  const completedCount = items.filter((i) => i.done).length
  const allDone = completedCount === items.length

  if (allDone) return null

  const pct = Math.round((completedCount / items.length) * 100)

  return (
    <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-900/10 to-transparent p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white/75">Getting Started</p>
          <p className="text-xs text-white/35 mt-0.5">{completedCount} of {items.length} steps complete</p>
        </div>
        <span className="text-sm font-bold text-violet-400 tabular-nums">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/[0.07] mb-5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            {/* Indicator */}
            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
              item.done
                ? 'bg-emerald-500/15'
                : 'border border-white/[0.12] bg-white/[0.03]'
            }`}>
              {item.done ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              )}
            </span>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <span className={`text-sm ${item.done ? 'text-white/35 line-through' : 'text-white/70'}`}>
                {item.label}
              </span>
            </div>

            {/* Action */}
            {!item.done && (
              <Link
                href={item.href}
                className="flex-shrink-0 text-xs text-violet-400/70 hover:text-violet-400 transition-colors"
              >
                Go →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
