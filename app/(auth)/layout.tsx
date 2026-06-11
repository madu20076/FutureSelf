export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#06060f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
