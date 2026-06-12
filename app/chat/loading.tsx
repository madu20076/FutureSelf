export default function ChatLoading() {
  return (
    <div className="flex flex-col h-screen bg-[#06060f] text-white animate-pulse">
      {/* Nav skeleton */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-24 rounded-full bg-white/10" />
          <div className="hidden sm:flex items-center gap-2 ml-1">
            <div className="h-3 w-px bg-white/10" />
            <div className="h-4 w-40 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-7 w-36 rounded-full bg-white/10" />
          <div className="h-4 w-12 rounded-full bg-white/10 hidden sm:block" />
          <div className="h-4 w-14 rounded-full bg-white/10 hidden sm:block" />
        </div>
      </nav>

      {/* Empty state skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 mx-auto mb-5" />
          <div className="h-5 w-40 rounded-full bg-white/10 mx-auto mb-3" />
          <div className="h-3 w-56 rounded-full bg-white/5 mx-auto mb-2" />
          <div className="h-3 w-44 rounded-full bg-white/5 mx-auto" />
          <div className="flex gap-2 justify-center mt-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 w-40 rounded-full bg-white/5" />
            ))}
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="flex-shrink-0 border-t border-white/[0.06] px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="h-12 rounded-2xl bg-white/[0.04] border border-white/10" />
        </div>
      </div>
    </div>
  )
}
