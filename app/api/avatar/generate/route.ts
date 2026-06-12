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

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = makeSupabase(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.DID_API_KEY
  const apiUrl = (process.env.DID_API_URL ?? 'https://api.d-id.com').replace(/\/$/, '')
  if (!apiKey) return NextResponse.json({ error: 'Avatar not configured' }, { status: 503 })

  const body = await req.json() as { text?: string; audioUrl?: string; portraitUrl?: string }
  const { audioUrl, portraitUrl } = body

  if (!audioUrl || !portraitUrl) {
    return NextResponse.json({ error: 'audioUrl and portraitUrl are required' }, { status: 400 })
  }

  // D-ID uses HTTP Basic auth: API key as username, empty password
  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`

  try {
    const res = await fetch(`${apiUrl}/talks`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        source_url: portraitUrl,
        script: {
          type: 'audio',
          audio_url: audioUrl,
        },
        config: { stitch: true },
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[avatar/generate] D-ID error:', res.status, errText)
      return NextResponse.json({ error: `D-ID returned ${res.status}` }, { status: 502 })
    }

    const data = await res.json() as { id: string; status: string }
    return NextResponse.json({ talkId: data.id })
  } catch (err) {
    console.error('[avatar/generate] fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach D-ID' }, { status: 502 })
  }
}
