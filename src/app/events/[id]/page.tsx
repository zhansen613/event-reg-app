export const dynamic = 'force-dynamic'

import { unstable_noStore as noStore } from 'next/cache'
import { supabaseServer } from '@/lib/supabase'
import { format } from 'date-fns'
import Markdown from '@/components/Markdown'
import RegisterForm from './register-form'
import { notFound } from 'next/navigation'

async function getData(eventId: string) {
  noStore()
  const sb = supabaseServer()

  const { data: event, error: evErr } = await sb
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()
  if (evErr) throw evErr
  if (!event) notFound()

  const { data: counts } = await sb
    .from('event_counts')
    .select('capacity, confirmed_count')
    .eq('id', eventId)
    .maybeSingle()

  const capacity = (counts?.capacity ?? event.capacity ?? 0) as number
  const confirmed = (counts?.confirmed_count ?? 0) as number
  const seatsLeft = Math.max(capacity - confirmed, 0)
  const isFull = seatsLeft <= 0

  const { data: questions } = await sb
    .from('event_questions')
    .select('id,label,type,required,options,position')
    .eq('event_id', eventId)
    .order('position', { ascending: true })

  return { event, seatsLeft, isFull, questions: questions || [] }
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const { event, seatsLeft, isFull, questions } = await getData(params.id)
  const proxied = (url: string) => `/img?u=${encodeURIComponent(url)}`

  return (
    <main className="mx-auto max-w-2xl p-6">
      {/* Event image */}
      {event.image_url && (
        <img
          src={proxied(event.image_url)}
          alt=""
          className="w-full h-56 md:h-72 object-cover rounded-2xl border mb-4"
        />
      )}

      {/* Title / when / where */}
      <h1 className="text-3xl font-semibold">{event.title}</h1>
      <p className="text-sm text-gray-600 mt-1">
        {event.start_at ? format(new Date(event.start_at), 'PPP p') : 'TBA'} · {event.location || 'TBA'}
      </p>

      {/* Description */}
      {event.description && (
        <p className="mt-3 text-sm text-gray-800">{event.description}</p>
      )}

      {/* Optional registration blurb (Markdown) */}
      {event.registration_blurb && (
        <div className="mt-4">
          <Markdown>{event.registration_blurb}</Markdown>
        </div>
      )}

      {/* Registration area (Step 5 gating) */}
      <div className="mt-6">
        {event.is_published ? (
          <RegisterForm
            eventId={event.id}
            isFull={isFull}
            seatsLeft={seatsLeft}
            questions={questions}
          />
        ) : (
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="text-lg font-semibold text-red-700">Registration not open yet</h3>
            <p className="mt-1 text-sm text-gray-700">
              This event is visible, but registration isn’t open. Please check back soon.
            </p>
          </div>
        )}
      </div>

      {/* Optional: quick links to event subpages, if you’re using them */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold">Additional event info</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href={`/events/${event.id}/agenda`} className="px-3 py-1.5 rounded-lg border text-xs">Agenda</a>
          <a href={`/events/${event.id}/parking`} className="px-3 py-1.5 rounded-lg border text-xs">Parking &amp; Transportation</a>
          <a href={`/events/${event.id}/venue`} className="px-3 py-1.5 rounded-lg border text-xs">Venue</a>
        </div>
      </div>
    </main>
  )
}
