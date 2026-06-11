// Server-only utility: admin session token helpers.
// Only import from Server Components or Server Actions.

export function getAdminToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) return null
  return Buffer.from(pw).toString('base64url')
}

export function isAdminAuthenticated(cookieValue: string | undefined): boolean {
  const expected = getAdminToken()
  return Boolean(expected && cookieValue === expected)
}
