'use client'

import { useState, useEffect, useRef } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [visible, setVisible]   = useState(false)
  const promptRef               = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setVisible(true)
    }

    function onInstalled() {
      setVisible(false)
      promptRef.current = null
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!promptRef.current) return
    setVisible(false)
    await promptRef.current.prompt()
    promptRef.current = null
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 p-4"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-sm mx-auto rounded-2xl border border-violet-500/20 bg-[#0d0d1f]/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/60 flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg select-none">
          F
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">Install FutureSelf</p>
          <p className="text-xs text-white/40 mt-0.5">Add to your home screen</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setVisible(false)}
            className="text-xs text-white/30 hover:text-white/55 transition-colors px-2 py-1 rounded-lg"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white active:scale-95 transition-transform"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}
