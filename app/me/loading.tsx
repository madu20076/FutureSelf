export default function MeLoading() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white animate-pulse">
      {/* Nav skeleton */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-16 border-b border-white/[0.06]">
        <div className="h-5 w-28 rounded-full bg-white/10" />
        <div className="flex gap-4">
          <div className="h-4 w-10 rounded-full bg-white/10" />
          <div className="h-4 w-16 rounded-full bg-white/10 hidden sm:block" />
          <div className="h-4 w-14 rounded-full bg-white/10" />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 md:px-8">
        {/* Badge + name */}
        <div className="mb-12">
          <div className="h-5 w-32 rounded-full bg-violet-500/15 mb-5" />
          <div className="h-10 w-56 rounded-xl bg-white/10 mb-2" />
          <div className="h-3 w-24 rounded-full bg-white/5 mb-6" />
          {/* Summary card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-2">
            <div className="h-3 w-28 rounded-full bg-fuchsia-400/20 mb-3" />
            <div className="h-3 w-full rounded-full bg-white/10" />
            <div className="h-3 w-5/6 rounded-full bg-white/10" />
            <div className="h-3 w-4/6 rounded-full bg-white/10" />
          </div>
        </div>

        {/* Grid rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 space-y-2">
              <div className="h-3 w-20 rounded-full bg-white/10 mb-3" />
              <div className="h-3 w-full rounded-full bg-white/5" />
              <div className="h-3 w-3/4 rounded-full bg-white/5" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 space-y-2">
              <div className="h-3 w-24 rounded-full bg-white/10 mb-3" />
              <div className="h-3 w-full rounded-full bg-white/5" />
              <div className="h-3 w-2/3 rounded-full bg-white/5" />
            </div>
          ))}
        </div>

        <div className="mb-10 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 space-y-2">
          <div className="h-3 w-40 rounded-full bg-white/10 mb-3" />
          <div className="h-3 w-full rounded-full bg-white/5" />
          <div className="h-3 w-5/6 rounded-full bg-white/5" />
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 mb-8">
          <div className="h-3 w-36 rounded-full bg-white/10 mb-4" />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 h-16 rounded-xl bg-white/[0.03] border border-white/[0.07]" />
            <div className="flex-1 h-16 rounded-xl bg-white/[0.03] border border-white/[0.07]" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-44 rounded-full bg-white/10" />
          <div className="h-10 w-32 rounded-full bg-white/[0.06]" />
          <div className="h-10 w-36 rounded-full bg-white/[0.06]" />
        </div>
      </main>
    </div>
  )
}
