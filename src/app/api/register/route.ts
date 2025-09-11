import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { googleCalendarUrl } from '@/lib/googleCalendar'
import { sendMail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { eventId, name, email, dept, answers } = await req.json()
    if (!eventId || !name || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const sb = supabaseServer()

    // 1) Load event details
    const { data: event, error: evErr } = await sb
      .from('events')
      .select('id, title, description, location, start_at, end_at, capacity')
      .eq('id', eventId)
      .single()
    if (evErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // 2) Capacity check
    const { data: counts, error: countsErr } = await sb
      .from('event_counts')
      .select('*')
      .eq('id', eventId)
      .single()
    if (countsErr) throw countsErr

    const confirmed = counts?.confirmed_count ?? 0
    const capacity  = counts?.capacity ?? 0
    const isFull    = confirmed >= capacity

    // 3) Insert registration and get checkin_code for tickets
    const { data: regRow, error: insertErr } = await sb
      .from('registrations')
      .insert({
        event_id: eventId,
        name,
        email,
        dept,
        status: isFull ? 'waitlisted' : 'confirmed',
answers: answers || {},
      })
      .select('id, checkin_code')
      .single()

    if (insertErr) {
      if ((insertErr as any).code === '23505') {
        return NextResponse.json({ error: 'You are already registered for this event.' }, { status: 409 })
      }
      throw insertErr
    }

    // 4) Build links: Google Calendar + Ticket
    const start = new Date(event.start_at)
    const end   = event.end_at ? new Date(event.end_at) : new Date(start.getTime() + 60 * 60 * 1000)

    const gcal = googleCalendarUrl({
      title:   event.title,
      details: event.description || '',
      location: event.location || '',
      start,
      end,
    })

    const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get('host')}`
    const ticketUrl = `${baseUrl}/ticket?code=${regRow.checkin_code}`

    // 5) Build and send email
    const statusText  = isFull ? 'Waitlist' : 'Registration Confirmed'
    const subject     = `${statusText}: ${event.title}`
    const friendlyDate = start.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })

    const calendarBtn = !isFull ? `
      <a href="${gcal}" target="_blank" rel="noopener"
         style="display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid #111;text-decoration:none;color:#111;margin-right:8px">
         Add to Google Calendar
      </a>` : ''

    const ticketLink = !isFull ? `
      <p style="margin:12px 0 0 0;">
        <a href="${ticketUrl}" target="_blank" rel="noopener">View your ticket / QR code</a>
      </p>` : `
      <p style="margin:12px 0 0 0;">You are on the waitlist. You'll get a note if a seat opens.</p>`

    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111;">
        <h2 style="margin:0 0 8px 0;">${statusText}</h2>
        <p style="margin:0 0 12px 0;"><strong>${event.title}</strong></p>
        <p style="margin:0 0 8px 0;">When: ${friendlyDate}</p>
        ${event.location ? `<p style="margin:0 0 8px 0;">Location: ${event.location}</p>` : ''}
        ${event.description ? `<p style="margin:0 0 12px 0;">${event.description}</p>` : ''}
        ${calendarBtn}
        ${ticketLink}
        <p style="margin:16px 0 0 0; font-size:12px; color:#666;">If you didn’t request this, please ignore this email.</p>
      </div>
    `.trim()

    // best-effort send (don’t block the response)
    sendMail(email, subject, html).catch((e) => console.error('Email send failed', e))

    return NextResponse.json({ message: isFull ? 'You are on the waitlist.' : 'Registration confirmed!' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}
