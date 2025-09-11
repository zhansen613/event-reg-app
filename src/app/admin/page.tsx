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
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl p-4">
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

  const checkSecret = async () => {
    setErr(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/events', { headers })
      if (!res.ok) throw new Error('Invalid secret or server error')
      const json = await res.json()
      setEvents(json.events || [])
      setSecretOk(true)
      localStorage.setItem('admin_secret', secret)
    } catch (e: any) {
      setErr(e.message)
      setSecretOk(false)
    } finally {
      setLoading(false)
    }
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
    if (!res.ok) {
      alert('Save failed')
      return
    }
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
    if (activeEvent) viewRegs(activeEvent) // reload regs
  }

  // Updated CSV to include attended + checkin_at
  const exportCSV = () => {
    const rows = [['name','email','dept','status','attended','checkin_at','created_at']]
    regs.forEach((r:any) => rows.push([
      r.name,
      r.email,
      r.dept || '',
      r.status,
      r.attended ? 'yes' : 'no',
      r.checkin_at || '',
      r.created_at
    ]))
    const csv = rows.map(r => r.map((c:any)=>`"${String(c).replaceAll('"','""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registrations-${activeEvent?.title || 'event'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!secretOk) {
    return (
      <main className="max-w-sm mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-3">Admin login</h1>
        <Text>Enter the admin secret you set in Vercel as <code>ADMIN_SECRET</code>.</Text>
        <input
          type="password"
          value={secret}
          onChange={(e)=>setSecret(e.target.value)}
          className="mt-3 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
          placeholder="Paste admin secret"
        />
        <button onClick={checkSecret} disabled={loading} className="mt-3 px-4 py-2 rounded-xl border text-sm">
          Continue
        </button>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin — Events</h1>
        <button onClick={openCreate} className="px-3 py-2 rounded-xl border text-sm">+ New Event</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {events.map((e:any) => (
          <div key={e.id} className="rounded-2xl border p-4 bg-white">
            <h3 className="text-lg font-semibold">{e.title}</h3>
            <p className="text-sm text-gray-600">
              {format(new Date(e.start_at), 'PPP p')} · {e.location || 'TBA'}
            </p>
            <p className="text-sm mt-2 line-clamp-3">{e.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={()=>openEdit(e)} className="px-3 py-1.5 rounded-lg border text-xs">Edit</button>
              <button onClick={()=>delEvent(e.id)} className="px-3 py-1.5 rounded-lg border text-xs">Delete</button>
              <button onClick={()=>viewRegs(e)} className="px-3 py-1.5 rounded-lg border text-xs">Registrations</button>
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
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Event form modal */}
      <Modal open={formOpen} onClose={()=>setFormOpen(false)} title={editing ? 'Edit event' : 'New event'}>
        <EventForm initial={editing} onSave={saveEvent} />
      </Modal>
    </main>
  )
}

function EventForm({ initial, onSave }: any) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [location, setLocation] = useState(initial?.location || '')
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
      start_at: startAt ? new Date(startAt).toISOString() : null,
      capacity: Number(capacity)
    }
    await onSave(payload)
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
