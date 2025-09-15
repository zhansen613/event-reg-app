'use client'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'

function Text({ className = '', children }: any) {
  return <p className={`text-sm text-gray-700 ${className}`}>{children}</p>
}
function Modal({ open, onClose, children, title }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-5xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Admin() {
  const [secret, setSecret] = useState<string>('')
  const [secretOk, setSecretOk] = useState<boolean>(false)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const [regOpen, setRegOpen] = useState(false)
  const [activeEvent, setActiveEvent] = useState<any | null>(null)
  const [regs, setRegs] = useState<any[]>([])

  useEffect(() => {
    const s = localStorage.getItem('admin_secret')
    if (s) setSecret(s)
  }, [])

  const headers = useMemo(() => ({ 'x-admin-secret': secret }), [secret])
  const proxied = (url: string) => `/img?u=${encodeURIComponent(url)}`

  const checkSecret = async () => {
    setErr(null); setLoading(true)
    try {
      const res = await fetch('/api/admin/events', { headers })
      if (!res.ok) throw new Error('Invalid secret or server error')
      const json = await res.json()
      setEvents(json.events || [])
      setSecretOk(true)
      localStorage.setItem('admin_secret', secret)
    } catch (e: any) {
      setErr(e.message); setSecretOk(false)
    } finally { setLoading(false) }
  }

  const refresh = async () => {
    const res = await fetch('/api/admin/events', { headers })
    const json = await res.json()
    setEvents(json.events || [])
  }

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (ev: any) => { setEditing(ev); setFormOpen(true) }

  const saveEvent = async (payload: any) => {
    const method = editing ? 'PATCH' : 'POST'
    const url = editing ? `/api/admin/events/${editing.id}` : '/api/admin/events'
    const res = await fetch(url, {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) { alert('Save failed'); return }
    setFormOpen(false)
    await refresh()
  }

  const delEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE', headers })
    if (!res.ok) { alert('Delete failed'); return }
    await refresh()
  }

  const viewRegs = async (ev: any) => {
    setActiveEvent(ev)
    const res = await fetch(`/api/admin/registrations?eventId=${ev.id}`, { headers })
    const json = await res.json()
    setRegs(json.registrations || [])
    setRegOpen(true)
  }

  const promote = async (regId: string) => {
    const res = await fetch('/api/admin/registrations/promote', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: regId })
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error || 'Promote failed'); return }
    if (activeEvent) viewRegs(activeEvent)
  }

  // Dynamic CSV: includes one column per custom question label
  const exportCSV = async () => {
    if (!activeEvent) {
      alert('Open Registrations for an event first')
      return
    }
    try {
      const qRes = await fetch(`/api/admin/questions?eventId=${activeEvent.id}`, { headers })
      const qJson = await qRes.json()
      const questions: Array<{ id: string; label: string }> = qJson.questions || []

      const baseHeaders = ['name','email','dept','status','attended','checkin_at','created_at']
      const questionHeaders = questions.map(q => q.label)
      const rows: string[][] = [ [...baseHeaders, ...questionHeaders] ]

      for (const r of regs as any[]) {
        const base = [
          r.name,
          r.email,
          r.dept || '',
          r.status,
          r.attended ? 'yes' : 'no',
          r.checkin_at || '',
          r.created_at
        ]
        const ans = (r.answers || {}) as Record<string, unknown>
        const qValues = questions.map((q) => {
          const v = (ans as any)[q.id]
          if (v === undefined || v === null) return ''
          if (Array.isArray(v)) return (v as any[]).join('; ')
          if (typeof v === 'boolean') return v ? 'yes' : 'no'
          return String(v)
        })
        rows.push([...base, ...qValues])
      }

      const encode = (s: unknown) => `"${String(s).replaceAll('"','""')}"`
      const csv = rows.map(r => r.map(encode).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registrations-${activeEvent?.title || 'event'}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'Export failed')
    }
  }

  if (!secretOk) {
    return (
      <main className="max-w-sm mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-3">Admin login</h1>
        <Text>Enter the admin secret set in Vercel as <code>ADMIN_SECRET</code>.</Text>
        <input
          type="password"
          value={secret}
          onChange={(e)=>setSecret(e.target.value)}
          className="mt-3 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
          placeholder="Paste admin secret"
        />
        <div className="mt-3 flex items-center gap-2">
          <button onClick={checkSecret} disabled={loading} className="px-4 py-2 rounded-xl border text-sm">Continue</button>
        </div>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin — Events</h1>
        <div className="flex items-center gap-2">
          <a href="/admin/site" className="px-3 py-2 rounded-xl border text-sm">Site Settings</a>
          <button onClick={openCreate} className="px-3 py-2 rounded-xl border text-sm">+ New Event</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {events.map((e:any) => (
          <div key={e.id} className="rounded-2xl border p-4 bg-white">
            {e.image_url && (
              <img src={proxied(e.image_url)} alt="" className="w-full h-40 object-cover rounded-xl border mb-3" />
            )}
            <h3 className="text-lg font-semibold">{e.title}</h3>
            <p className="text-sm text-gray-600">
              {format(new Date(e.start_at), 'PPP p')} · {e.location || 'TBA'}
            </p>
            <p className="text-sm mt-2 line-clamp-3">{e.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={()=>openEdit(e)} className="px-3 py-1.5 rounded-lg border text-xs">Edit</button>
              <button onClick={()=>delEvent(e.id)} className="px-3 py-1.5 rounded-lg border text-xs">Delete</button>
              <button onClick={()=>viewRegs(e)} className="px-3 py-1.5 rounded-lg border text-xs">Registrations</button>
              <a href={`/admin/questions?eventId=${e.id}`} className="px-3 py-1.5 rounded-lg border text-xs">Questions</a>
              <a href={`/admin/insights?eventId=${e.id}`} className="px-3 py-1.5 rounded-lg border text-xs">Insights</a>
              <a href={`/admin/sections?eventId=${e.id}`} className="px-3 py-1.5 rounded-lg border text-xs">Sections</a>
            </div>
          </div>
        ))}
      </div>

      {/* Registrations Modal */}
      <Modal open={regOpen} onClose={()=>setRegOpen(false)} title={`Registrations — ${activeEvent?.title || ''}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-600">{regs.length} total</p>
          <div className="flex items-center gap-2">
            <button onClick={()=>activeEvent && viewRegs(activeEvent)} className="px-3 py-1.5 rounded-lg border text-xs">Refresh</button>
            <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg border text-xs">Export CSV</button>
          </div>
        </div>

        <div className="max-h-96 overflow-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Dept</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Attended</th>
                <th className="text-left p-2">Check-in</th>
                <th className="text-left p-2">When Registered</th>
                <th className="text-left p-2"></th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r:any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{r.dept || ''}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{r.attended ? '✓' : ''}</td>
                  <td className="p-2">{r.checkin_at ? format(new Date(r.checkin_at), 'PP p') : ''}</td>
                  <td className="p-2">{format(new Date(r.created_at), 'PP p')}</td>
                  <td className="p-2 text-right">
                    {r.status === 'waitlisted' && (
                      <button onClick={()=>promote(r.id)} className="px-2 py-1 rounded-lg border text-xs">Promote</button>
                    )}
                  </td>
                </tr>
              ))}
              {regs.length === 0 && (
                <tr><td className="p-2 text-gray-600 text-sm" colSpan={8}>No registrations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Event form modal */}
      <Modal open={formOpen} onClose={()=>setFormOpen(false)} title={editing ? 'Edit event' : 'New event'}>
        <EventForm initial={editing} onSave={saveEvent} secret={secret} />
      </Modal>
    </main>
  )
}

function EventForm({ initial, onSave, secret }: any) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [registrationBlurb, setRegistrationBlurb] = useState(initial?.registration_blurb || '')
  const [location, setLocation] = useState(initial?.location || '')
  const [imageUrl, setImageUrl] = useState(initial?.image_url || '')
  const [uploading, setUploading] = useState(false)
  const [startAt, setStartAt] = useState<string>(() => {
    if (!initial?.start_at) return ''
    const d = new Date(initial.start_at)
    const pad = (n:number)=>String(n).padStart(2,'0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [capacity, setCapacity] = useState(initial?.capacity || 50)

  const submit = async () => {
    const payload = {
      title,
      description,
      location,
      image_url: imageUrl || null,
      start_at: startAt ? new Date(startAt).toISOString() : null,
      capacity: Number(capacity),
      registration_blurb: registrationBlurb || null,
    }
    await onSave(payload)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('kind', 'event')
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-secret': secret },
        body: fd
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setImageUrl(json.url)
    } catch (e:any) {
      alert(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Title</label>
          <input className="border rounded-xl px-3 py-2 text-sm" value={title} onChange={(e)=>setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Location</label>
          <input className="border rounded-xl px-3 py-2 text-sm" value={location} onChange={(e)=>setLocation(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm">Description</label>
          <textarea className="border rounded-xl px-3 py-2 text-sm" rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} />
        </div>

        {/* NEW: Registration blurb */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm">Registration blurb (shows on event page above the form)</label>
          <textarea
            className="border rounded-xl px-3 py-2 text-sm"
            rows={3}
            placeholder="Any special instructions, parking info, agenda highlights, etc."
            value={registrationBlurb}
            onChange={(e)=>setRegistrationBlurb(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm">Image</label>
          <div className="flex items-center gap-2">
            <input
              className="border rounded-xl px-3 py-2 text-sm flex-1"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e)=>setImageUrl(e.target.value)}
            />
            <label className="px-3 py-2 rounded-xl border text-sm cursor-pointer">
              {uploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e)=>{ const f=e.target.files?.[0]; if (f) handleUpload(f) }}
              />
            </label>
          </div>
          {imageUrl && <img src={`/img?u=${encodeURIComponent(imageUrl)}`} alt="" className="mt-2 w-full h-36 object-cover rounded-xl border" />}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm">Start (local time)</label>
          <input type="datetime-local" className="border rounded-xl px-3 py-2 text-sm" value={startAt} onChange={(e)=>setStartAt(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Capacity</label>
          <input type="number" min={1} className="border rounded-xl px-3 py-2 text-sm" value={capacity} onChange={(e)=>setCapacity(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={submit} className="px-4 py-2 rounded-xl border text-sm">Save</button>
      </div>
    </div>
  )
}
