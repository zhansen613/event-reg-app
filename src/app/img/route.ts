// Proxies public Supabase Storage images through your own domain.
// Prevents corp firewalls that block *.supabase.co from breaking images.

export const dynamic = 'force-dynamic'

const ALLOWED_SEGMENTS = [
  '/storage/v1/object/public/event-images/',
  '/storage/v1/object/public/site-assets/',
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const u = searchParams.get('u') || ''
  // basic safety: only allow our two public buckets
  if (!u || !ALLOWED_SEGMENTS.some(seg => u.includes(seg))) {
    return new Response('Bad Request', { status: 400 })
  }

  // Fetch and stream the image
  const upstream = await fetch(u, { cache: 'no-store' })
  if (!upstream.ok || !upstream.body) {
    return new Response('Not Found', { status: 404 })
  }

  const ct = upstream.headers.get('content-type') || 'image/jpeg'
  // Stream the body back with cache headers on YOUR domain
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Content-Disposition': 'inline',
    },
  })
}
