export const dynamic = 'force-dynamic'

import { unstable_noStore as noStore } from 'next/cache'
import { supabaseServer } from '@/lib/supabase'
import RegisterForm from './register-form'
import { format } from 'date-fns'
import Markdown from '@/components/Markdown'


async function getEvent(id: string) {
  noStore()
  const sb = supabaseServer()
  const { data: event, error } = await sb.from('events').select('*').eq('id', id).single()
  if (error) throw error

  const { data: counts } = await sb.from('event_counts').select('*').eq('id', id).single()
  const { data: questions } = await sb
    .from('event_questions')
    .select('*')
    .eq('event_id', id)
    .order('position', { ascending: true })

  return { event, counts, questions: questions || [] }
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const { event, counts, questions } = await getEvent(params.id)
  const seatsLeft = Math.max((counts?.capacity ?? 0) - (counts?.confirmed_count ?? 0), 0)
  const isFull = seatsLeft <= 0

  const proxied = (url: string) => `/img?u=${encodeURIComponent(url)}`

  return (
    <main className="mx-auto max-w-2xl p-6">
      {/* Event image at top */}
      {event.image_url && (
        <img
          src={proxied(event.image_url)}
          alt=""
          className="w-full h-56 md:h-72 object-cover rounded-2xl border mb-4"
        />
      )}

      {/* Title + meta */}
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      <p className="text-sm text-gray-600">
        {format(new Date(event.start_at), 'PPP p')} · {event.location ?? 'TBA'}
      </p>

      {/* Event description (optional) */}
      {event.description && <p className="mt-3 text-sm">{event.description}</p>}

      {/* Admin blurb (above the registration form) */}
      {event.registration_blurb && (
  <div className="mt-4 rounded-2xl border bg-white p-4">
    <Markdown>{event.registration_blurb}</Markdown>
  </div>
)}

      {/* Registration form */}
      <div className="mt-6">
        <RegisterForm
          eventId={event.id}
          isFull={isFull}
          seatsLeft={seatsLeft}
          questions={questions}
        />
      </div>
    </main>
  )
}
