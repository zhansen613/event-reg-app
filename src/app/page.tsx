import { supabaseServer } from '@/lib/supabase'
import Link from 'next/link'
import { format } from 'date-fns'

async function getEvents() {
  const sb = supabaseServer()
  const { data, error } = await sb.from('events').select('*').order('start_at', { ascending: true })
  if (error) throw error
  return data
}

export default async function Home() {
  const events = await getEvents()
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-semibold mb-4">Events</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {events.map((e) => (
          <div key={e.id} className="rounded-2xl border p-4 bg-white">
            <h3 className="text-lg font-semibold">{e.title}</h3>
            <p className="text-sm text-gray-600">
              {format(new Date(e.start_at), 'PPP p')} · {e.location ?? 'TBA'}
            </p>
            <p className="text-sm mt-2 line-clamp-3">{e.description}</p>
            <div className="mt-3 flex justify-between items-center">
              <Link className="text-sm px-3 py-2 rounded-xl border" href={`/events/${e.id}`}>View</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
