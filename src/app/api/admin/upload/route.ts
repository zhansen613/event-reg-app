import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { randomUUID } from 'crypto'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

export async function POST(req: Request) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ct = req.headers.get('content-type') || ''
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Use multipart/form-data' }, { status: 400 })
  }

  const form = await req.formData()
  const kind = String(form.get('kind') || '') // 'event' | 'hero'
  const file = form.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const f = file as File
  const allowed = ['image/jpeg','image/png','image/webp','image/gif']
  if (!allowed.includes(f.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WEBP, GIF allowed' }, { status: 400 })
  }

  const ab = await f.arrayBuffer()
  if (ab.byteLength > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Max 4MB' }, { status: 400 })
  }

  const sb = supabaseServer()
  const bucket = kind === 'hero' ? 'site-assets' : 'event-images'
  const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
  const key = kind === 'hero'
    ? `hero/${randomUUID()}.${ext}`
    : `events/${randomUUID()}.${ext}`

  const { error } = await sb.storage.from(bucket).upload(key, ab, {
    contentType: f.type,
    upsert: false,
    cacheControl: '3600',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: pub } = sb.storage.from(bucket).getPublicUrl(key)
  return NextResponse.json({ url: pub.publicUrl })
}
