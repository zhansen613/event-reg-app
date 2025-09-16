import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

// GET /api/admin/events
export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = supabaseServer()
  const { data, error } = await sb
    .from('events')
    .select('*')
    .order('start_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data || [] })
}

// POST /api/admin/events
export async function POST(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const payload = {
    title: body.title || '',
    description: body.description ?? null,
    location: body.location ?? null,
    image_url: body.image_url ?? null,
    start_at: body.start_at ?? null,
    capacity: typeof body.capacity === 'number' ? body.capacity : 50,
    registration_blurb: body.registration_blurb ?? null,
    is_published: typeof body.is_published === 'boolean' ? body.is_published : true,
  }
  const sb = supabaseServer()
  const { error } = await sb.from('events').insert(payload)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
