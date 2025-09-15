import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { Resend } from 'resend'

type Status = 'confirmed' | 'waitlisted' | 'cancelled'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { eventId, name, email, dept, answers } = body || {}

    if (!eventId || !name || !email) {
      return NextResponse.json({ ok: false, error: 'Missing eventId, name, or email' }, { status: 400 })
    }

    const sb = supabaseServer()

    // Prevent duplicate (non-cancelled) registration for same event + email
    {
      const { data: existing, error } = await sb
        .from('registrations')
        .select('id,status')
        .eq('event_id', eventId)
        .eq('email', email)
        .neq('status', 'cancelled')
        .maybeSingle()

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      if (existing) {
        return NextResponse.json(
          { ok: false, error: 'This email is already registered for this event.' },
          { status: 409 }
        )
      }
    }

    // Compute status from capacity
    let status: Status = 'waitlisted'
    {
      const { data: counts, error } = await sb
        .from('event_counts')
        .select('capacity, confirmed_count')
        .eq('id', eventId)
        .single()

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      const seatsLeft = Math.max((counts?.capacity ?? 0) - (counts?.confirmed_count ?? 0), 0)
      status = seatsLeft > 0 ? 'confirmed' : 'waitlisted'
    }

    // Insert registration
    const { data: inserted, error: insErr } = await sb
      .from('registrations')
      .insert({
        event_id: eventId,
        name,
        email,
        dept: dept ?? null,
        answers: answers ?? {},
        status,
      })
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      return NextResponse.json({ ok: false, error: insErr?.message || 'Insert failed' }, { status: 500 })
    }

    // Build ticket link (use registration id as token)
    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(req.url).origin)

    const regId = inserted.id as string
    const ticketUrl = status === 'confirmed'
      ? `${baseUrl}/ticket?t=${encodeURIComponent(regId)}`
      : null

    // Send email (best-effort; failures are logged but do NOT break the response)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const from = process.env.EMAIL_FROM || 'no-reply@onresend.com'
        const subject =
          status === 'confirmed'
            ? 'Registration confirmed'
            : 'You are on the waitlist'

        const html =
          status === 'confirmed'
            ? `
              <p>Hi ${name},</p>
              <p>Your registration is <strong>confirmed</strong>.</p>
              <p><a href="${ticketUrl}">View your ticket / QR code</a></p>
              <p>Add to Google Calendar:</p>
              <p><a href="${baseUrl}/api/calendar/ics?rid=${encodeURIComponent(regId)}">Download .ics</a></p>
            `
            : `
              <p>Hi ${name},</p>
              <p>You are currently <strong>waitlisted</strong>. We will notify you if a spot opens.</p>
            `

        await resend.emails.send({
          from,
          to: email,
          subject,
          html,
        })
      } catch (e) {
        console.error('Email send failed:', e)
        // do not throw — we still return success so the UI shows the download button
      }
    }

    // Success response (always includes ticketUrl for confirmed)
    return NextResponse.json({
      ok: true,
      status,
      registrationId: regId,
      ticketUrl,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
