'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { regenerateProfileAction } from '@/app/actions/onboarding'

export function RegenerateButton({ storageOnly }: { storageOnly?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (storageOnly) {
      router.refresh()
      return
    }
    startTransition(async () => {
      const result = await regenerateProfileAction()
      if (result.success) {
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
          Regenerating…
        </>
      ) : (
        <>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3" />
          </svg>
          Regenerate Profile
        </>
      )}
    </button>
  )
}
