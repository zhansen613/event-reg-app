import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const updates: any = {}
  if (body.slug) updates.slug = String(body.slug).toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (body.title !== undefined) updates.title = body.title
  if (body.body_md !== undefined) updates.body_md = body.body_md
  if (body.position !== undefined) updates.position = Number(body.position)

  const sb = supabaseServer()
  const { error } = await sb.from('event_sections').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = supabaseServer()
  const { error } = await sb.from('event_sections').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
