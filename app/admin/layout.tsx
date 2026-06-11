export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#06060f] text-white flex flex-col">
      {children}
      <footer className="mt-auto py-5 border-t border-white/[0.06] text-center">
        <p className="text-xs text-white/20">FutureSelf Version 1.0</p>
      </footer>
    </div>
  )
}
