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
  const eventId = searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
  const sb = supabaseServer()
  const { data, error } = await sb
    .from('event_questions')
    .select('*')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data })
}

export async function POST(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { event_id, label, type, required, options } = body
  if (!event_id || !label) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const sb = supabaseServer()
  // compute next position
  const { data: maxPosData } = await sb
    .from('event_questions')
    .select('position')
    .eq('event_id', event_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPos = (maxPosData?.position ?? 0) + 1

  const { error } = await sb.from('event_questions').insert({
    event_id, label,
    type: type || 'short_text',
    required: !!required,
    options: Array.isArray(options) ? options : null,
    position: nextPos
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
