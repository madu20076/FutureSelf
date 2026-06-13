export function BetaBadge() {
  return (
    <div
      className="fixed bottom-6 left-4 z-30 pointer-events-none select-none"
      style={{ bottom: 'max(24px, env(safe-area-inset-bottom))' }}
    >
      <span className="inline-flex items-center rounded-full border border-white/[0.09] bg-white/[0.03] backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/30">
        FutureSelf Beta
      </span>
    </div>
  )
}
