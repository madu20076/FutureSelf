import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function makeSupabase(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

type DIDTalkResponse = {
  status: 'created' | 'started' | 'done' | 'error'
  result_url?: string
  error?: { description: string }
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = makeSupabase(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.DID_API_KEY
  const apiUrl = (process.env.DID_API_URL ?? 'https://api.d-id.com').replace(/\/$/, '')
  if (!apiKey) return NextResponse.json({ error: 'Avatar not configured' }, { status: 503 })

  const talkId = new URL(req.url).searchParams.get('talkId')
  if (!talkId) return NextResponse.json({ error: 'talkId is required' }, { status: 400 })

  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`

  try {
    const res = await fetch(`${apiUrl}/talks/${encodeURIComponent(talkId)}`, {
      headers: { Authorization: authHeader, Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[avatar/status] D-ID error:', res.status, errText)
      return NextResponse.json({ error: `D-ID returned ${res.status}` }, { status: 502 })
    }

    const data = (await res.json()) as DIDTalkResponse
    return NextResponse.json({
      status:       data.status,
      resultUrl:    data.result_url    ?? null,
      errorMessage: data.error?.description ?? null,
    })
  } catch (err) {
    console.error('[avatar/status] fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach D-ID' }, { status: 502 })
  }
}
