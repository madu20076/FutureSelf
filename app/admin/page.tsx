import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin'
import { getAdminClient } from '@/lib/supabase/admin'
import { adminLogoutAction } from '@/app/actions/admin'

export const dynamic = 'force-dynamic'

// ── Types ────────────────────────────────────────────────────────────────────

type Stats = {
  totalUsers: number
  totalProfiles: number
  totalPublicProfiles: number
  totalSessions: number
  totalMessages: number
}

type RecentUser = {
  id: string
  email: string
  displayName: string | null
  createdAt: string
}

type RecentChat = {
  sessionId: string
  userEmail: string
  displayName: string | null
  lastMessage: string | null
  lastMessageAt: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncate(s: string | null, n = 60): string {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-white/35 mt-1 font-medium">{label}</p>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
      {children}
    </p>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin-session')?.value

  if (!isAdminAuthenticated(session)) {
    redirect('/admin/login')
  }

  const adminClient = getAdminClient()
  const hasServiceKey = Boolean(adminClient)

  const emptyStats: Stats = {
    totalUsers: 0,
    totalProfiles: 0,
    totalPublicProfiles: 0,
    totalSessions: 0,
    totalMessages: 0,
  }
  let stats = emptyStats
  let recentUsers: RecentUser[] = []
  let recentChats: RecentChat[] = []

  if (adminClient) {
    // ── Parallel stat queries ──────────────────────────────────────────────
    const [
      usersRes,
      profilesRes,
      publicProfilesRes,
      sessionsRes,
      messagesRes,
    ] = await Promise.all([
      adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true }),
      adminClient
        .from('futureself_profiles')
        .select('*', { count: 'exact', head: true }),
      adminClient
        .from('futureself_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true),
      adminClient
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true }),
      adminClient
        .from('chat_messages')
        .select('*', { count: 'exact', head: true }),
    ])

    stats = {
      totalUsers: usersRes.count ?? 0,
      totalProfiles: profilesRes.count ?? 0,
      totalPublicProfiles: publicProfilesRes.count ?? 0,
      totalSessions: sessionsRes.count ?? 0,
      totalMessages: messagesRes.count ?? 0,
    }

    // ── Recent users ───────────────────────────────────────────────────────
    const { data: usersData } = await adminClient
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (usersData && usersData.length > 0) {
      const userIds = usersData.map((u) => u.id)
      const { data: fpData } = await adminClient
        .from('futureself_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds)

      const fpMap = Object.fromEntries(
        (fpData ?? []).map((fp) => [fp.user_id, fp.display_name as string | null])
      )

      recentUsers = usersData.map((u) => ({
        id: u.id,
        email: u.email ?? '—',
        displayName: fpMap[u.id] ?? null,
        createdAt: u.created_at,
      }))
    }

    // ── Recent chats ───────────────────────────────────────────────────────
    const { data: chatsData } = await adminClient.rpc(
      'get_admin_recent_chats'
    )

    if (chatsData) {
      recentChats = (
        chatsData as Array<{
          session_id: string
          user_email: string
          display_name: string | null
          last_message: string | null
          last_message_at: string | null
        }>
      ).map((c) => ({
        sessionId: c.session_id,
        userEmail: c.user_email,
        displayName: c.display_name,
        lastMessage: c.last_message,
        lastMessageAt: c.last_message_at,
      }))
    }
  }

  return (
    <div className="flex-1">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-10 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            FutureSelf
          </span>
          <span className="text-white/20 text-sm">/</span>
          <span className="text-sm font-medium text-white/55">Admin</span>
        </div>
        <form action={adminLogoutAction}>
          <button
            type="submit"
            className="text-sm text-white/35 hover:text-white/60 transition-colors"
          >
            Sign out
          </button>
        </form>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 md:px-10">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Live Dashboard
          </div>
          <h1 className="text-3xl font-bold text-white">Overview</h1>
          {!hasServiceKey && (
            <p className="mt-2 text-sm text-amber-400/70">
              Add{' '}
              <code className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded text-xs">
                SUPABASE_SERVICE_ROLE_KEY
              </code>{' '}
              to .env.local for live data.
            </p>
          )}
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          <StatCard
            label="Total Users"
            value={stats.totalUsers}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <StatCard
            label="Total Profiles"
            value={stats.totalProfiles}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
          <StatCard
            label="Public Profiles"
            value={stats.totalPublicProfiles}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            }
          />
          <StatCard
            label="Chat Sessions"
            value={stats.totalSessions}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Total Messages"
            value={stats.totalMessages}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Recent Users ── */}
          <div>
            <SectionHeading>Recent Users</SectionHeading>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              {recentUsers.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-white/25">
                  {hasServiceKey ? 'No users yet.' : 'Service key required.'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user, i) => (
                      <tr
                        key={user.id}
                        className={`${
                          i !== recentUsers.length - 1
                            ? 'border-b border-white/[0.04]'
                            : ''
                        } hover:bg-white/[0.02] transition-colors`}
                      >
                        <td className="px-5 py-3.5 text-white/70 font-medium">
                          {user.displayName ?? (
                            <span className="text-white/25 italic">
                              No profile
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-white/45 font-mono text-xs">
                          {user.email}
                        </td>
                        <td className="px-5 py-3.5 text-white/35 whitespace-nowrap">
                          {fmt(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Recent Chats ── */}
          <div>
            <SectionHeading>Recent Chats</SectionHeading>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              {recentChats.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-white/25">
                  {hasServiceKey ? 'No chats yet.' : 'Service key required.'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                        Last Message
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentChats.map((chat, i) => (
                      <tr
                        key={chat.sessionId}
                        className={`${
                          i !== recentChats.length - 1
                            ? 'border-b border-white/[0.04]'
                            : ''
                        } hover:bg-white/[0.02] transition-colors`}
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-white/70 font-medium">
                            {chat.displayName ?? (
                              <span className="text-white/25 italic">Unknown</span>
                            )}
                          </p>
                          <p className="text-white/30 text-xs font-mono mt-0.5">
                            {chat.userEmail}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-white/40 max-w-[180px]">
                          <span className="line-clamp-2 text-xs leading-relaxed">
                            {truncate(chat.lastMessage)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-white/30 whitespace-nowrap text-xs">
                          {fmt(chat.lastMessageAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
