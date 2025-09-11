import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'


function checkSecret(req: Request) {
const hdr = req.headers.get('x-admin-secret') || ''
const secret = process.env.ADMIN_SECRET
return hdr && secret && hdr === secret
}


export async function POST(req: Request) {
if (!checkSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const { registrationId } = await req.json()
if (!registrationId) return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 })


const sb = supabaseServer()
// 1) Load registration to get event_id
const { data: reg, error: regErr } = await sb
.from('registrations').select('id, event_id, status')
.eq('id', registrationId).single()
if (regErr || !reg) return NextResponse.json({ error: regErr?.message || 'Not found' }, { status: 404 })
if (reg.status === 'confirmed') return NextResponse.json({ message: 'Already confirmed' })


// 2) Check capacity
const { data: counts, error: countsErr } = await sb
.from('event_counts').select('*').eq('id', reg.event_id).single()
if (countsErr) return NextResponse.json({ error: countsErr.message }, { status: 500 })


const confirmed = counts?.confirmed_count ?? 0
const capacity = counts?.capacity ?? 0
if (confirmed >= capacity) return NextResponse.json({ error: 'Event at capacity' }, { status: 409 })


// 3) Promote
const { error: updErr } = await sb
.from('registrations')
.update({ status: 'confirmed' })
.eq('id', registrationId)
if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })


return NextResponse.json({ message: 'Promoted to confirmed' })
}
