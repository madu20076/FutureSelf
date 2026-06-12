export default function ConversationLoading() {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#06060f] text-white overflow-hidden animate-pulse">
      {/* Nav skeleton */}
      <nav className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="h-5 w-20 rounded-full bg-white/10" />
        <div className="h-7 w-44 rounded-full bg-white/10" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-12 rounded-full bg-white/10" />
          <div className="h-4 w-14 rounded-full bg-white/10" />
        </div>
      </nav>

      {/* Portrait skeleton */}
      <div
        className="flex-shrink-0 bg-gradient-to-b from-white/[0.03] to-transparent"
        style={{ height: 'min(50vh, 440px)' }}
      />

      {/* Controls skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="h-5 w-28 rounded-full bg-white/10" />
        <div className="w-24 h-24 rounded-full bg-white/[0.08]" />
        <div className="h-4 w-52 rounded-full bg-white/[0.06]" />
      </div>
    </div>
  )
}
