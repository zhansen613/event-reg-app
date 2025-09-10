import { supabaseServer } from '@/lib/supabase'
import RegisterForm from './register-form'
import { format } from 'date-fns'

async function getEvent(id: string) {
  const sb = supabaseServer()
  const { data: event, error } = await sb.from('events').select('*').eq('id', id).single()
  if (error) throw error

  const { data: counts } = await sb.from('event_counts').select('*').eq('id', id).single()
  return { event, counts }
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const { event, counts } = await getEvent(params.id)
  const seatsLeft = Math.max((counts?.capacity ?? 0) - (counts?.confirmed_count ?? 0), 0)
  const isFull = seatsLeft <= 0

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      <p className="text-sm text-gray-600">
        {format(new Date(event.start_at), 'PPP p')} · {event.location ?? 'TBA'}
      </p>
      <p className="mt-3 text-sm">{event.description}</p>

      <div className="mt-6">
        <RegisterForm eventId={event.id} isFull={isFull} seatsLeft={seatsLeft} />
      </div>
    </main>
  )
}
