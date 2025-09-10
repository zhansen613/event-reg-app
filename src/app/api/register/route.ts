import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { eventId, name, email, dept } = await req.json()
    if (!eventId || !name || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const sb = supabaseServer()

    // 1) Pull capacity + current confirmed count
    const { data: counts, error: countsErr } =
      await sb.from('event_counts').select('*').eq('id', eventId).single()
    if (countsErr) throw countsErr

    const confirmed = counts?.confirmed_count ?? 0
    const capacity  = counts?.capacity ?? 0
    const isFull    = confirmed >= capacity

    // 2) Insert with correct status
    const { error: insertErr } = await sb.from('registrations').insert({
      event_id: eventId,
      name,
      email,
      dept,
      status: isFull ? 'waitlisted' : 'confirmed',
    })

    if (insertErr) {
      // Unique violation on (event_id, email)
      if ((insertErr as any).code === '23505') {
        return NextResponse.json({ error: 'You are already registered for this event.' }, { status: 409 })
      }
      throw insertErr
    }

    return NextResponse.json({
      message: isFull ? 'You are on the waitlist.' : 'Registration confirmed!'
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}
