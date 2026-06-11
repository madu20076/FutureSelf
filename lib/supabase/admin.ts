// Server-only: creates a Supabase client using the service role key,
// which bypasses RLS and is required for admin data access.
// Never import this in Client Components or API routes that serve end-users.

import { createClient } from '@supabase/supabase-js'

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
