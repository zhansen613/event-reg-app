import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

function checkSecret(req: Request) {
  const hdr = req.headers.get('x-admin-secret') || ''
  const secret = process.env.ADMIN_SECRET
  return hdr && secret && hdr === secret
}

// POST /api/admin/events/:id/copy
// Body:
// {
//   title?: string,
//   start_at?: string|null,
//   location?: string|null,
//   capacity?: number|null,
//   copy_questions?: boolean,
//   copy_sections?: boolean,
//   copy_image?: boolean,
//   copy_blurb?: boolean
// }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sourceId = params.id
  const body = await req.json()

  const copyQuestions = !!body.copy_questions
  const copySections  = !!body.copy_sections
  const copyImage     = !!body.copy_image
  const copyBlurb     = !!body.copy_blurb

  const sb = supabaseServer()

  // 1) Load source event
  const { data: src, error: e1 } = await sb.from('events').select('*').eq('id', sourceId).single()
  if (e1 || !src) return NextResponse.json({ error: e1?.message || 'Source event not found' }, { status: 404 })

  // 2) Prepare new event row
  const insertEvent = {
    title: body.title || `${src.title} (Copy)`,
    description: src.description || null,
    location: body.location ?? src.location ?? null,
    start_at: body.start_at ?? src.start_at ?? null,
    end_at: null, // optional, not copied by default
    capacity: typeof body.capacity === 'number' ? body.capacity : (src.capacity ?? 50),
    image_url: copyImage ? (src.image_url ?? null) : null,
    registration_blurb: copyBlurb ? (src.registration_blurb ?? null) : null,
  }

  // 3) Create new event
  const { data: ins, error: e2 } = await sb.from('events').insert(insertEvent).select('id').single()
  if (e2 || !ins?.id) return NextResponse.json({ error: e2?.message || 'Failed to create event' }, { status: 500 })
  const newEventId = ins.id as string

  // 4) Optionally copy questions
  if (copyQuestions) {
    const { data: qs, error: qErr } = await sb
      .from('event_questions')
      .select('type,label,required,options,position')
      .eq('event_id', sourceId)
      .order('position', { ascending: true })

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

    if (qs && qs.length > 0) {
      const rows = qs.map(q => ({
        event_id: newEventId,
        type: q.type,
        label: q.label,
        required: q.required,
        options: q.options,
        position: q.position,
      }))
      const { error: insQErr } = await sb.from('event_questions').insert(rows)
      if (insQErr) return NextResponse.json({ error: insQErr.message }, { status: 500 })
    }
  }

  // 5) Optionally copy sections
  if (copySections) {
    const { data: secs, error: sErr } = await sb
      .from('event_sections')
      .select('slug,title,body_md,position')
      .eq('event_id', sourceId)
      .order('position', { ascending: true })

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

    if (secs && secs.length > 0) {
      const rows = secs.map(s => ({
        event_id: newEventId,
        slug: s.slug,
        title: s.title,
        body_md: s.body_md,
        position: s.position,
      }))
      const { error: insSErr } = await sb.from('event_sections').insert(rows)
      if (insSErr) return NextResponse.json({ error: insSErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, newEventId })
}
