import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

// POST /api/admin/expected
// body: { eventId: string, rows: Array<{ name: string, email: string, dept?: string }> }
export async function POST(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const eventId = body?.eventId as string
  const rows = (body?.rows || []) as Array<{ name: string; email: string; dept?: string }>

  if (!eventId || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Missing eventId or rows' }, { status: 400 })
  }

  // Normalize: trim + lowercase emails, trim names/dept
  const clean = rows
    .map(r => ({
      event_id: eventId,
      name: (r.name || '').trim(),
      email: (r.email || '').trim().toLowerCase(),
      dept: (r.dept || '').trim() || null
    }))
    .filter(r => r.name && r.email)

  const sb = supabaseServer()
  const { data, error } = await sb
    .from('expected_registrants')
    .upsert(clean, { onConflict: 'event_id,email' }) // relies on the unique index
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, insertedOrUpdated: data?.length || 0 })
}
