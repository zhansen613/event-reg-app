import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId') || ''
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

  const sb = supabaseServer()
  const { data, error } = await sb
    .from('event_sections')
    .select('*')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sections: data || [] })
}

export async function POST(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { event_id, slug, title, body_md, position } = body || {}
  if (!event_id || !slug || !title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const safeSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const sb = supabaseServer()
  const { error } = await sb.from('event_sections').insert({
    event_id, slug: safeSlug, title, body_md: body_md || '', position: Number(position ?? 1),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
