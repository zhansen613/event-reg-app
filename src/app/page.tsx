export const dynamic = 'force-dynamic'

import { unstable_noStore as noStore } from 'next/cache'
import { supabaseServer } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'
import Markdown from '@/components/Markdown'


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

  const proxied = (url: string) => `/img?u=${encodeURIComponent(url)}`

  return (
    <main className="mx-auto max-w-5xl p-6">
      {heroImage && (
        <img src={proxied(heroImage)} alt="" className="w-full h-56 md:h-72 object-cover rounded-2xl border mb-4" />
      )}

      <h1 className="text-3xl font-semibold">{landingTitle}</h1>
      {landingBody && (
  <div className="mt-2">
    <Markdown>{landingBody}</Markdown>
  </div>
)}

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {events.map((e: any) => (
          <Link key={e.id} href={`/events/${e.id}`} className="rounded-2xl border p-3 bg-white hover:shadow-sm transition">
            {e.image_url ? (
              <img src={proxied(e.image_url)} alt="" className="w-full h-40 object-cover rounded-xl border mb-3" />
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
