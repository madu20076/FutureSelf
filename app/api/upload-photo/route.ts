import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return Response.json({ error: 'Storage not configured.' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return Response.json({ error: 'Not authenticated.' }, { status: 401 })

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated.' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const files = formData.getAll('photos') as File[]

  if (files.length === 0 || files.length > 5) {
    return Response.json({ error: 'Upload 1–5 photos.' }, { status: 400 })
  }

  const urls: string[] = []

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Only image files are accepted.' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'Each photo must be under 10 MB.' }, { status: 400 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${user.id}/input/${Date.now()}-${safeName}`
    const bytes = new Uint8Array(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('future-portraits')
      .upload(filename, bytes, { contentType: file.type, upsert: false })

    if (uploadError) {
      return Response.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data } = supabase.storage.from('future-portraits').getPublicUrl(filename)
    urls.push(data.publicUrl)
  }

  return Response.json({ urls })
}
