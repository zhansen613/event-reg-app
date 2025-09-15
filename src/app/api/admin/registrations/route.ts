import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

// GET /api/admin/registrations?eventId=...
export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const eventId = new URL(req.url).searchParams.get('eventId') || ''
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

  const sb = supabaseServer()
  const { data, error } = await sb
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ registrations: data || [] })
}

/**
 * POST /api/admin/registrations
 * Body: { eventId, name, email, dept?, answers?, desiredStatus?: 'auto'|'confirmed'|'waitlisted', forceConfirm?: boolean }
 * - Prevents duplicate active registration for same event/email.
 * - If desiredStatus='auto', respects capacity via event_counts.
 */
export async function POST(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { eventId, name, email } = body || {}
  const dept = body?.dept ?? null
  const answers = body?.answers ?? {}
  const desiredStatus = (body?.desiredStatus || 'auto') as 'auto' | 'confirmed' | 'waitlisted'
  const forceConfirm = !!body?.forceConfirm

  if (!eventId || !name || !email) {
    return NextResponse.json({ error: 'Missing eventId, name, or email' }, { status: 400 })
  }

  const sb = supabaseServer()

  // Dedupe (non-cancelled)
  const { data: existing, error: exErr } = await sb
    .from('registrations')
    .select('id,status')
    .eq('event_id', eventId)
    .eq('email', email)
    .neq('status', 'cancelled')
    .maybeSingle()
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 })
  if (existing) {
    return NextResponse.json({ error: 'This email is already registered for this event.' }, { status: 409 })
  }

  let status: 'confirmed' | 'waitlisted' = 'waitlisted'
  if (forceConfirm || desiredStatus === 'confirmed') {
    status = 'confirmed'
  } else if (desiredStatus === 'waitlisted') {
    status = 'waitlisted'
  } else {
    // auto: decide by capacity
    const { data: counts, error: cErr } = await sb
      .from('event_counts')
      .select('capacity, confirmed_count')
      .eq('id', eventId)
      .single()
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
    const seatsLeft = Math.max((counts?.capacity ?? 0) - (counts?.confirmed_count ?? 0), 0)
    status = seatsLeft > 0 ? 'confirmed' : 'waitlisted'
  }

  const { error: insErr } = await sb.from('registrations').insert({
    event_id: eventId,
    name,
    email,
    dept,
    status,
    answers
  })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, status })
}
