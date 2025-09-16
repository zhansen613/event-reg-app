import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

// GET /api/admin/insights?eventId=...
export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const eventId = url.searchParams.get('eventId') || ''
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

  const sb = supabaseServer()

  const [{ data: expected, error: e1 }, { data: regs, error: e2 }] = await Promise.all([
    sb.from('expected_registrants')
      .select('name,email,dept')
      .eq('event_id', eventId),
    sb.from('registrations')
      .select('email,status')
      .eq('event_id', eventId)
  ])

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  // consider "registered" = any non-cancelled registration
  const registeredSet = new Set(
    (regs || [])
      .filter(r => r.status !== 'cancelled')
      .map(r => (r.email || '').trim().toLowerCase())
  )

  const ex = expected || []
  const missing = ex.filter(er => !registeredSet.has((er.email || '').trim().toLowerCase()))
  const matched = ex.filter(er => registeredSet.has((er.email || '').trim().toLowerCase()))

  return NextResponse.json({
    eventId,
    expected_total: ex.length,
    registered_total: matched.length,
    missing_total: missing.length,
    expected_registered: matched, // [{name,email,dept}]
    expected_missing: missing     // [{name,email,dept}]
  })
}
