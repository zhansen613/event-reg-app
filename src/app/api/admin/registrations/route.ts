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
.from('registrations')
.select('*')
.eq('event_id', eventId)
.order('created_at', { ascending: true })
if (error) return NextResponse.json({ error: error.message }, { status: 500 })
return NextResponse.json({ registrations: data })
}
