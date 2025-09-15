'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Markdown from '@/components/Markdown'

export const dynamic = 'force-dynamic'

type Section = {
  id: string
  event_id: string
  slug: string
  title: string
  body_md: string
  position: number
}

function Row({ s, onEdit, onDelete }: { s: Section; onEdit: (s: Section)=>void; onDelete:(id:string)=>void }) {
  return (
    <div className="rounded-xl border p-3 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{s.title} <span className="text-gray-500">({s.slug})</span></div>
          <div className="text-xs text-gray-600">Position: {s.position}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>onEdit(s)} className="px-2 py-1 rounded-lg border text-xs">Edit</button>
          <button onClick={()=>onDelete(s.id)} className="px-2 py-1 rounded-lg border text-xs">Delete</button>
        </div>
      </div>
    </div>
  )
}

function Form({
  initial, onSave, onCancel
}: {
  initial?: Partial<Section> | null,
  onSave: (payload: Partial<Section>) => void,
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [slug, setSlug] = useState(initial?.slug || '')
  const [position, setPosition] = useState<number>(initial?.position || 1)
  const [body, setBody] = useState(initial?.body_md || '')

  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="grid gap-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm">Title</label>
            <input className="border rounded-xl px-3 py-2 text-sm w-full" value={title} onChange={(e)=>setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Slug (URL)</label>
            <input className="border rounded-xl px-3 py-2 text-sm w-full" placeholder="agenda" value={slug} onChange={(e)=>setSlug(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Position</label>
            <input type="number" className="border rounded-xl px-3 py-2 text-sm w-full" value={position} onChange={(e)=>setPosition(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="text-sm">Body (Markdown)</label>
          <textarea rows={8} className="border rounded-xl px-3 py-2 text-sm w-full" value={body} onChange={(e)=>setBody(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>onSave({ title, slug, position, body_md: body })} className="px-4 py-2 rounded-xl border text-sm">Save</button>
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
        </div>
        {body && (
          <div className="mt-3">
            <div className="text-xs text-gray-600 mb-1">Preview</div>
            <div className="rounded-xl border p-3 bg-white">
              <Markdown>{body}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionsInner() {
  const sp = useSearchParams()
  const eventId = sp.get('eventId') || ''

  const [secret, setSecret] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [editing, setEditing] = useState<Section | null>(null)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const s = localStorage.getItem('admin_secret')
    if (s) setSecret(s)
  }, [])

  const headers = useMemo(() => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' }), [secret])

  const load = async () => {
    if (!eventId) return
    setErr(null)
    const res = await fetch(`/api/admin/sections?eventId=${eventId}`, { headers })
    const json = await res.json()
    if (!res.ok) { setErr(json.error || 'Failed to load'); return }
    setSections(json.sections || [])
  }

  useEffect(() => { load() }, [eventId, secret])

  const addQuick = async (slug: string, title: string) => {
    const res = await fetch('/api/admin/sections', {
      method: 'POST',
      headers,
      body: JSON.stringify({ event_id: eventId, slug, title, position: sections.length + 1 })
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error || 'Create failed'); return }
    await load()
  }

  const saveNew = async (payload: Partial<Section>) => {
    const res = await fetch('/api/admin/sections', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, event_id: eventId })
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error || 'Create failed'); return }
    setAdding(false)
    await load()
  }

  const saveEdit = async (payload: Partial<Section>) => {
    if (!editing) return
    const res = await fetch(`/api/admin/sections/${editing.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error || 'Update failed'); return }
    setEditing(null)
    await load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this section?')) return
    const res = await fetch(`/api/admin/sections/${id}`, { method: 'DELETE', headers })
    const json = await res.json()
    if (!res.ok) { alert(json.error || 'Delete failed'); return }
    await load()
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin — Sections</h1>
        <a href={`/admin`} className="px-3 py-2 rounded-xl border text-sm">Back</a>
      </div>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      <div className="rounded-2xl border p-4 bg-white mb-4">
        <div className="text-sm text-gray-700 mb-2">Quick add</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>addQuick('agenda', 'Agenda')} className="px-3 py-1.5 rounded-lg border text-xs">+ Agenda</button>
          <button onClick={()=>addQuick('parking-transportation', 'Parking & Transportation')} className="px-3 py-1.5 rounded-lg border text-xs">+ Parking & Transportation</button>
          <button onClick={()=>addQuick('venue', 'Venue')} className="px-3 py-1.5 rounded-lg border text-xs">+ Venue</button>
          <button onClick={()=>setAdding(true)} className="px-3 py-1.5 rounded-lg border text-xs">+ Custom</button>
        </div>
      </div>

      {adding && (
        <div className="mb-4">
          <Form initial={null} onSave={saveNew} onCancel={()=>setAdding(false)} />
        </div>
      )}

      <div className="grid gap-3">
        {sections.map(s => (
          <Row
            key={s.id}
            s={s}
            onEdit={(sec)=>setEditing(sec)}
            onDelete={del}
          />
        ))}
      </div>

      {editing && (
        <div className="mt-4">
          <Form initial={editing} onSave={saveEdit} onCancel={()=>setEditing(null)} />
        </div>
      )}
    </main>
  )
}

export default function SectionsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-6">Loading…</main>}>
      <SectionsInner />
    </Suspense>
  )
}
