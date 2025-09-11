'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

function QuestionsInner() {
  const sp = useSearchParams()
  const eventId = sp.get('eventId') || ''
  const [secret, setSecret] = useState('')
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [form, setForm] = useState({ id: null as string | null, label: '', type: 'short_text', required: false, optionsCsv: '' })

  useEffect(() => { const s = localStorage.getItem('admin_secret'); if (s) setSecret(s) }, [])
  const headers = useMemo(() => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' }), [secret])

  const load = async () => {
    if (!eventId) return
    const res = await fetch(`/api/admin/questions?eventId=${eventId}`, { headers })
    const json = await res.json()
    if (!res.ok) { setErr(json.error || 'Error'); return }
    setQuestions(json.questions || [])
  }

  useEffect(() => { load() }, [eventId, secret]) // load once secret is present

  const resetForm = () => setForm({ id: null, label: '', type: 'short_text', required: false, optionsCsv: '' })

  const save = async () => {
    setLoading(true)
    setErr(null)
    try {
      const payload: any = {
        event_id: eventId,
        label: form.label,
        type: form.type,
        required: form.required,
        options: form.type === 'select' || form.type === 'multiselect'
          ? form.optionsCsv.split(',').map(s => s.trim()).filter(Boolean)
          : null
      }
      const url = form.id ? `/api/admin/questions/${form.id}` : '/api/admin/questions'
      const method = form.id ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      resetForm()
      await load()
    } catch (e:any) { setErr(e.message) } finally { setLoading(false) }
  }

  const edit = (q:any) => setForm({
    id: q.id, label: q.label, type: q.type, required: q.required,
    optionsCsv: Array.isArray(q.options) ? q.options.join(', ') : ''
  })

  const del = async (id:string) => {
    if (!confirm('Delete question?')) return
    const res = await fetch(`/api/admin/questions/${id}`, { method:'DELETE', headers })
    if (!res.ok) alert('Delete failed'); else load()
  }

  const move = async (idx:number, dir:-1|1) => {
    const tgt = idx + dir
    if (tgt < 0 || tgt >= questions.length) return
    const a = questions[idx], b = questions[tgt]
    // swap their positions
    await fetch(`/api/admin/questions/${a.id}`, { method:'PATCH', headers, body: JSON.stringify({ position: b.position }) })
    await fetch(`/api/admin/questions/${b.id}`, { method:'PATCH', headers, body: JSON.stringify({ position: a.position }) })
    load()
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin — Questions</h1>
      {!eventId && <p className="text-sm text-red-600">Missing eventId in URL.</p>}

      <div className="mb-4">
        <label className="text-sm">Admin Secret</label>
        <input
          type="password"
          value={secret}
          onChange={(e)=>{ setSecret(e.target.value); localStorage.setItem('admin_secret', e.target.value) }}
          className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
          placeholder="Paste ADMIN_SECRET"
        />
      </div>

      <div className="rounded-2xl border p-4 mb-6 bg-white">
        <h3 className="text-lg font-semibold mb-2">{form.id ? 'Edit question' : 'Add question'}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Label</label>
            <input className="border rounded-xl px-3 py-2 text-sm w-full" value={form.label} onChange={(e)=>setForm({...form, label:e.target.value})} />
          </div>
          <div>
            <label className="text-sm">Type</label>
            <select className="border rounded-xl px-3 py-2 text-sm w-full" value={form.type} onChange={(e)=>setForm({...form, type:e.target.value})}>
              <option value="short_text">Short text</option>
              <option value="long_text">Long text</option>
              <option value="select">Select</option>
              <option value="multiselect">Multi-select</option>
              <option value="checkbox">Checkbox</option>
            </select>
          </div>
          {(form.type === 'select' || form.type === 'multiselect') && (
            <div className="sm:col-span-2">
              <label className="text-sm">Options (comma-separated)</label>
              <input className="border rounded-xl px-3 py-2 text-sm w-full" value={form.optionsCsv} onChange={(e)=>setForm({...form, optionsCsv:e.target.value})} placeholder="e.g. Vegetarian, Vegan, Gluten-free" />
            </div>
          )}
          <div>
            <label className="text-sm">Required</label>
            <div><input type="checkbox" checked={form.required} onChange={(e)=>setForm({...form, required:e.target.checked})} /></div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={loading || !eventId || !form.label} className="px-4 py-2 rounded-xl border text-sm">Save</button>
          {form.id && <button onClick={resetForm} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>}
        </div>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      </div>

      <div className="rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Label</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Required</th>
              <th className="text-left p-2">Position</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q:any, idx:number) => (
              <tr key={q.id} className="border-t">
                <td className="p-2">{q.label}</td>
                <td className="p-2">{q.type}</td>
                <td className="p-2">{q.required ? 'Yes' : ''}</td>
                <td className="p-2">{q.position}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={()=>move(idx, -1)} className="px-2 py-1 rounded-lg border text-xs">↑</button>
                  <button onClick={()=>move(idx, +1)} className="px-2 py-1 rounded-lg border text-xs">↓</button>
                  <button onClick={()=>edit(q)} className="px-2 py-1 rounded-lg border text-xs">Edit</button>
                  <button onClick={()=>del(q.id)} className="px-2 py-1 rounded-lg border text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {questions.length === 0 && (
              <tr><td className="p-2 text-gray-600 text-sm" colSpan={5}>No questions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl p-6">Loading…</main>}>
      <QuestionsInner />
    </Suspense>
  )
}
