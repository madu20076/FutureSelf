'use client'

import { useState, useEffect, useRef } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState = 'loading' | 'ready' | 'installed' | 'ios' | 'unavailable'

export function InstallSection() {
  const [state, setState] = useState<InstallState>('loading')
  const promptRef         = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setState('installed')
      return
    }

    // iOS Safari — no beforeinstallprompt, show manual instructions
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    if (isIos) {
      setState('ios')
      return
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setState('ready')
    }

    function onInstalled() {
      setState('installed')
      promptRef.current = null
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    // If no prompt after a short time, browser doesn't support it
    const timer = setTimeout(() => {
      setState((prev) => (prev === 'loading' ? 'unavailable' : prev))
    }, 600)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      clearTimeout(timer)
    }
  }, [])

  async function handleInstall() {
    if (!promptRef.current) return
    await promptRef.current.prompt()
    const { outcome } = await promptRef.current.userChoice
    if (outcome === 'accepted') setState('installed')
    promptRef.current = null
  }

  if (state === 'loading' || state === 'unavailable') return null

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-violet-400"
          >
            <path d="M12 2v13" />
            <path d="m5 9 7 7 7-7" />
            <path d="M5 20h14" />
          </svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/35">
          Install App
        </p>
      </div>

      {state === 'installed' && (
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-white/70">FutureSelf is installed</p>
            <p className="text-xs text-white/30 mt-0.5">Open from your home screen or app library.</p>
          </div>
        </div>
      )}

      {state === 'ready' && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/70">Add to Home Screen</p>
            <p className="text-xs text-white/30 mt-0.5">Install for a native app experience — offline support, faster loading.</p>
          </div>
          <button
            onClick={handleInstall}
            className="flex-shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] transition-all active:scale-95"
          >
            Install
          </button>
        </div>
      )}

      {state === 'ios' && (
        <div>
          <p className="text-sm font-medium text-white/70 mb-2">Add to Home Screen</p>
          <p className="text-xs text-white/35 leading-relaxed">
            To install on iPhone or iPad: tap the{' '}
            <span className="inline-flex items-center gap-0.5 text-violet-400 font-medium">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </span>{' '}
            button in Safari, then choose <span className="text-violet-400 font-medium">Add to Home Screen</span>.
          </p>
        </div>
      )}
    </div>
  )
}
