import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

export async function POST(req: Request) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { code } = await req.json()
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const sb = supabaseServer()
  const { data: reg, error: findErr } = await sb
    .from('registrations')
    .select('id, attended')
    .eq('checkin_code', code)
    .single()

  if (findErr || !reg) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }
  if (reg.attended) {
    return NextResponse.json({ message: 'Already checked in' })
  }

  const { error: updErr } = await sb
    .from('registrations')
    .update({ attended: true, checkin_at: new Date().toISOString() })
    .eq('id', reg.id)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Checked in' })
}
