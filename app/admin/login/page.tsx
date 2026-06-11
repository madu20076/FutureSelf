'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { adminLoginAction } from '@/app/actions/admin'

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(adminLoginAction, null)

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-6"
          >
            FutureSelf
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs font-medium text-white/40 mb-4">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Admin Access
          </div>
          <h1 className="text-2xl font-bold text-white">Dashboard Login</h1>
          <p className="text-white/35 text-sm mt-1.5">
            Enter your admin password to continue.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
          <form action={action} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/55 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Admin password"
                required
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-white/20 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-colors"
              />
            </div>

            {state?.error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-1"
            >
              {pending ? 'Verifying…' : 'Access Dashboard'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-5">
          <Link href="/" className="hover:text-white/40 transition-colors">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  )
}
