import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = supabaseServer()
  const { data, error } = await sb.from('events').select('*').order('start_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data })
}

export async function POST(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const sb = supabaseServer()
  const { error } = await sb.from('events').insert({
    title: body.title,
    description: body.description,
    location: body.location,
    start_at: body.start_at,
    end_at: body.end_at || null,
    capacity: body.capacity ?? 50,
    image_url: body.image_url || null,
    registration_blurb: body.registration_blurb || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
