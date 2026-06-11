'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAdminToken } from '@/lib/admin'

export type AdminLoginState = { error: string } | null

export async function adminLoginAction(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const password = formData.get('password') as string
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return {
      error: 'Admin not configured. Add ADMIN_PASSWORD to your .env.local.',
    }
  }

  if (password !== adminPassword) {
    return { error: 'Invalid password.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('admin-session', getAdminToken()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

  redirect('/admin')
}

export async function adminLogoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('admin-session')
  redirect('/admin/login')
}
