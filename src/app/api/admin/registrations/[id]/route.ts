import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

// PATCH /api/admin/registrations/[id]
// Body: { name?, email?, dept?, status?, attended?, checkin_at?, answers? }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const updates: any = {}
  for (const k of ['name','email','dept','status','attended','checkin_at','answers']) {
    if (body[k] !== undefined) updates[k] = body[k]
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No updates' }, { status: 400 })

  const sb = supabaseServer()
  const { error } = await sb.from('registrations').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/registrations/[id]?autopromote=1
// Soft-cancel (status='cancelled') and optionally promote oldest waitlisted.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const autopromote = url.searchParams.get('autopromote') === '1'

  const sb = supabaseServer()

  // Find the registration to learn event_id
  const { data: reg, error: rErr } = await sb
    .from('registrations')
    .select('event_id,status')
    .eq('id', params.id)
    .single()
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const { error: delErr } = await sb
    .from('registrations')
    .update({ status: 'cancelled' })
    .eq('id', params.id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  let promoted: string | null = null
  if (autopromote && reg?.event_id) {
    const { data: next, error: nErr } = await sb
      .from('registrations')
      .select('id')
      .eq('event_id', reg.event_id)
      .eq('status', 'waitlisted')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!nErr && next?.id) {
      const { error: uErr } = await sb
        .from('registrations')
        .update({ status: 'confirmed' })
        .eq('id', next.id)
      if (!uErr) promoted = next.id
    }
  }

  return NextResponse.json({ ok: true, promoted })
}
