export const dynamic = 'force-dynamic'

import { unstable_noStore as noStore } from 'next/cache'
import { supabaseServer } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'

async function getData() {
  noStore()
  const sb = supabaseServer()
  const { data: site } = await sb.from('site_settings').select('*').eq('id', 1).maybeSingle()
  const { data: events } = await sb.from('events').select('*').order('start_at', { ascending: true })
  return { site, events: events || [] }
}

export default async function HomePage() {
  const { site, events } = await getData()
  const landingTitle = site?.landing_title || 'Events'
  const landingBody  = site?.landing_body || ''
  const heroImage    = site?.hero_image_url || ''

  return (
    <main className="mx-auto max-w-5xl p-6">
      {/* Hero image */}
      {heroImage && (
        <img src={heroImage} alt="" className="w-full h-56 md:h-72 object-cover rounded-2xl border mb-4" />
      )}

      {/* Title + blurb */}
      <h1 className="text-3xl font-semibold">{landingTitle}</h1>
      {landingBody && <p className="mt-2 text-sm text-gray-700">{landingBody}</p>}

      {/* Events grid */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {events.map((e: any) => (
          <Link key={e.id} href={`/events/${e.id}`} className="rounded-2xl border p-3 bg-white hover:shadow-sm transition">
            {/* Event image */}
            {e.image_url ? (
              <img src={e.image_url} alt="" className="w-full h-40 object-cover rounded-xl border mb-3" />
            ) : (
              <div className="w-full h-40 rounded-xl border mb-3 bg-gradient-to-r from-gray-100 to-gray-200" />
            )}
            <h3 className="text-lg font-semibold">{e.title}</h3>
            <p className="text-sm text-gray-600">
              {format(new Date(e.start_at), 'PPP p')} · {e.location || 'TBA'}
            </p>
            {e.description && <p className="text-sm mt-2 line-clamp-2">{e.description}</p>}
          </Link>
        ))}
        {events.length === 0 && (
          <div className="text-sm text-gray-600">No events yet.</div>
        )}
      </div>
    </main>
  )
}
