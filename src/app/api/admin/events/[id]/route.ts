import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

// PATCH /api/admin/events/:id
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const updates: any = {}
  for (const k of ['title','description','location','image_url','start_at','capacity','registration_blurb']) {
    if (body[k] !== undefined) updates[k] = body[k]
  }
  if (typeof body.is_published === 'boolean') updates.is_published = body.is_published

  const sb = supabaseServer()
  const { error } = await sb.from('events').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/events/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = supabaseServer()
  const { error } = await sb.from('events').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
