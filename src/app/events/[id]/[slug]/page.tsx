export const dynamic = 'force-dynamic'

import { unstable_noStore as noStore } from 'next/cache'
import { supabaseServer } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'
import Markdown from '@/components/Markdown'

async function getData(eventId: string, slug: string) {
  noStore()
  const sb = supabaseServer()
  const { data: event, error: e1 } = await sb.from('events').select('*').eq('id', eventId).single()
  if (e1) throw e1
  const { data: section, error: e2 } = await sb
    .from('event_sections')
    .select('*')
    .eq('event_id', eventId)
    .eq('slug', slug)
    .single()
  if (e2) throw e2

  const { data: all } = await sb
    .from('event_sections')
    .select('slug, title, position')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
  return { event, section, nav: all || [] }
}

export default async function SectionPage({ params }: { params: { id: string; slug: string } }) {
  const { event, section, nav } = await getData(params.id, params.slug)
  const proxied = (url: string) => `/img?u=${encodeURIComponent(url)}`

  return (
    <main className="mx-auto max-w-2xl p-6">
      {/* Header image (optional) */}
      {event.image_url && (
        <img src={proxied(event.image_url)} alt="" className="w-full h-40 md:h-56 object-cover rounded-2xl border mb-4" />
      )}

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">{event.title}</h1>
        <a href={`/events/${event.id}`} className="text-sm underline">Back to event</a>
      </div>
      <p className="text-xs text-gray-600 mb-4">{format(new Date(event.start_at), 'PPP p')} · {event.location ?? 'TBA'}</p>

      {/* Local nav */}
      {nav.length > 0 && (
        <div className="rounded-2xl border bg-white p-3 mb-4">
          <div className="text-xs text-gray-600 mb-1">More info</div>
          <div className="flex flex-wrap gap-2">
            {nav.map(n => (
              <Link key={n.slug} href={`/events/${event.id}/${n.slug}`} className={`px-2 py-1 rounded-lg border text-xs ${n.slug === section.slug ? 'bg-gray-50' : ''}`}>
                {n.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Section body (Markdown) */}
      <div className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
        {section.body_md
          ? <Markdown>{section.body_md}</Markdown>
          : <p className="text-sm text-gray-600">No details yet.</p>}
      </div>
    </main>
  )
}
