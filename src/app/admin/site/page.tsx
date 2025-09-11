'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'

export const dynamic = 'force-dynamic'

function SiteInner() {
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    landing_title: 'Events',
    landing_body: '',
    hero_image_url: ''
  })

  useEffect(() => {
    const s = localStorage.getItem('admin_secret')
    if (s) setSecret(s)
  }, [])

  const headers = useMemo(() => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' }), [secret])

  const load = async () => {
    if (!secret) return
    setErr(null)
    const res = await fetch('/api/admin/site', { headers })
    const json = await res.json()
    if (!res.ok) { setErr(json.error || 'Load failed'); return }
    const s = json.settings || {}
    setForm({
      landing_title: s.landing_title || 'Events',
      landing_body: s.landing_body || '',
      hero_image_url: s.hero_image_url || ''
    })
  }

  useEffect(() => { load() }, [secret])

  const save = async () => {
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/admin/site', { method: 'PATCH', headers, body: JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      alert('Saved!')
    } catch (e:any) {
      setErr(e.message)
    } finally { setLoading(false) }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin — Site Settings</h1>
        <a href="/admin" className="px-3 py-2 rounded-xl border text-sm">Back</a>
      </div>

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

      <div className="rounded-2xl border p-4 bg-white">
        <div className="grid gap-3">
          <div>
            <label className="text-sm">Hero Image URL (optional)</label>
            <input className="border rounded-xl px-3 py-2 text-sm w-full"
                   value={form.hero_image_url}
                   onChange={(e)=>setForm({...form, hero_image_url: e.target.value})}
                   placeholder="https://..." />
          </div>
          <div>
            <label className="text-sm">Landing Title</label>
            <input className="border rounded-xl px-3 py-2 text-sm w-full"
                   value={form.landing_title}
                   onChange={(e)=>setForm({...form, landing_title: e.target.value})} />
          </div>
          <div>
            <label className="text-sm">Landing Body (optional)</label>
            <textarea rows={4} className="border rounded-xl px-3 py-2 text-sm w-full"
                      value={form.landing_body}
                      onChange={(e)=>setForm({...form, landing_body: e.target.value})}
                      placeholder="Short description or welcome text..." />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={loading} className="px-4 py-2 rounded-xl border text-sm">Save</button>
          <button onClick={load} className="px-4 py-2 rounded-xl border text-sm">Reload</button>
        </div>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      </div>

      {form.hero_image_url && (
        <div className="rounded-2xl border p-4 bg-white mt-4">
          <p className="text-sm text-gray-600 mb-2">Preview</p>
          <img src={form.hero_image_url} alt="" className="w-full h-48 object-cover rounded-xl border" />
          <h2 className="mt-3 text-xl font-semibold">{form.landing_title}</h2>
          {form.landing_body && <p className="mt-1 text-sm">{form.landing_body}</p>}
        </div>
      )}
    </main>
  )
}

export default function SitePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl p-6">Loading…</main>}>
      <SiteInner />
    </Suspense>
  )
}
