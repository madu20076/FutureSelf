import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/onboarding', '/dashboard', '/me', '/chat', '/memories', '/portraits']
const authRoutes = ['/login', '/signup']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // If Supabase is not configured, pass all routes through so the app
  // remains navigable during local development without env vars.
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (!supabaseConfigured) {
    return NextResponse.next()
  }

  const token = request.cookies.get('sb-access-token')?.value
  const isAuthenticated = Boolean(token)

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r))
  const isAuthPage = authRoutes.some((r) => pathname.startsWith(r))

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
