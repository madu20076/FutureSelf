import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { PwaRegister } from './pwa-register'
import { InstallPrompt } from './components/install-prompt'
import { FeedbackButton } from './components/feedback-button'
import { BetaBadge } from './components/beta-badge'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#7c3aed',
}

export const metadata: Metadata = {
  title: 'FutureSelf — Create an AI version of yourself',
  description:
    'Train your FutureSelf with your memories, beliefs, goals, and personality. Then let yourself or others chat with it.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FutureSelf',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
        <InstallPrompt />
        <FeedbackButton />
        <BetaBadge />
      </body>
    </html>
  )
}
