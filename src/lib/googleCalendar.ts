export function googleCalendarUrl(opts: {
  title: string
  details?: string
  location?: string
  start: Date
  end: Date
}) {
  const toGCal = (d: Date) =>
    d.toISOString()           // 2025-10-15T14:00:00.000Z
      .replace(/[-:]/g, '')   // 20251015T140000.000Z
      .replace(/\.\d{3}/, '') // 20251015T140000Z
  const params = new URLSearchParams()
  params.set('action', 'TEMPLATE')
  params.set('text', opts.title)
  params.set('dates', `${toGCal(opts.start)}/${toGCal(opts.end)}`)
  if (opts.details) params.set('details', opts.details)
  if (opts.location) params.set('location', opts.location)
  params.set('trp', 'false')
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
