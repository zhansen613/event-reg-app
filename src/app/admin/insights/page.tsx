'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'

/* ---------------- Modal ---------------- */
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

/* ---------------- Types ---------------- */
type Question = {
  id: string
  label: string
  type: string
  required?: boolean
  options?: string[] | null
  position?: number
}

type Registration = {
  id: string
  name: string
  email: string
  dept?: string | null
  status: 'confirmed' | 'waitlisted' | 'cancelled'
  attended?: boolean | null
  checkin_at?: string | null
  created_at: string
  answers: Record<string, unknown> | null
}

type EventLite = {
  id: string
  title: string
  start_at: string | null
  location: string | null
  capacity: number | null
  image_url?: string | null
}

/* ---------------- Helpers ---------------- */
// minimal CSV parser (handles quotes and commas)
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ } else { inQ = false }
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { row.push(cur); cur = '' }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else if (ch === '\r') { /* ignore */ }
      else cur += ch
    }
  }
  row.push(cur)
  rows.push(row)
  if (rows.length && rows[rows.length - 1].every(c => c === '')) rows.pop()
  return rows
}

function useAdminHeaders() {
  const [secret, setSecret] = useState('')
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const s = localStorage.getItem('admin_secret')
    if (s) { setSecret(s); setOk(true) }
  }, [])
  return { ok, secret, headers: useMemo(() => ({ 'x-admin-secret': secret }), [secret]), setSecret, setOk }
}

/* ---------------- Insights Inner Page ---------------- */
function InsightsInner() {
  const search = useSearchParams()
  const eventId = search.get('eventId') || ''
  const { ok, secret, headers, setSecret, setOk } = useAdminHeaders()

  // Core data
  const [event, setEvent] = useState<EventLite | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [regs, setRegs] = useState<Registration[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Expected vs Registered diff
  const [expectedStats, setExpectedStats] = useState<any | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [preview, setPreview] = useState<Array<{name: string; email: string; dept?: string}>>([])

  /* ----- fetchers ----- */
  const fetchAll = async () => {
    if (!eventId) return
    setLoading(true); setErr(null)
    try {
      // 1) Event list (find the one we need)
      const evRes = await fetch('/api/admin/events', { headers })
      const evJson = await evRes.json()
      if (!evRes.ok) throw new Error(evJson.error || 'Failed to fetch events')
      const ev: EventLite | undefined = (evJson.events || []).find((e: EventLite) => e.id === eventId)
      setEvent(ev || null)

      // 2) Questions
      const qRes = await fetch(`/api/admin/questions?eventId=${encodeURIComponent(eventId)}`, { headers })
      const qJson = await qRes.json()
      if (!qRes.ok) throw new Error(qJson.error || 'Failed to fetch questions')
      setQuestions(qJson.questions || [])

      // 3) Registrations
      const rRes = await fetch(`/api/admin/registrations?eventId=${encodeURIComponent(eventId)}`, { headers })
      const rJson = await rRes.json()
      if (!rRes.ok) throw new Error(rJson.error || 'Failed to fetch registrations')
      setRegs(rJson.registrations || [])

      // 4) Expected vs Registered stats
      const sRes = await fetch(`/api/admin/insights?eventId=${encodeURIComponent(eventId)}`, { headers })
      const sJson = await sRes.json()
      if (!sRes.ok) throw new Error(sJson.error || 'Failed to fetch expected stats')
      setExpectedStats(sJson)
    } catch (e: any) {
      setErr(e.message || 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (ok && eventId) fetchAll() }, [ok, eventId])

  /* ----- computed: summary cards ----- */
  const counts = useMemo(() => {
    const confirmed = regs.filter(r => r.status === 'confirmed').length
    const waitlisted = regs.filter(r => r.status === 'waitlisted').length
    const cancelled = regs.filter(r => r.status === 'cancelled').length
    const attended = regs.filter(r => !!r.attended).length
    const capacity = event?.capacity ?? 0
    const seatsLeft = Math.max((capacity || 0) - confirmed, 0)
    return { confirmed, waitlisted, cancelled, attended, capacity: capacity || 0, seatsLeft }
  }, [regs, event])

  /* ----- computed: per-question tallies (for select, multiselect, checkboxes, boolean) ----- */
  type QStat = {
    id: string
    label: string
    kind: 'select' | 'multiselect' | 'checkboxes' | 'boolean' | 'text'
    totals?: { option: string; count: number }[]
    responses?: number
  }

  const questionStats: QStat[] = useMemo(() => {
    const stats: QStat[] = []
    const nonCancelled = regs.filter(r => r.status !== 'cancelled')
    const answersList = nonCancelled.map(r => r.answers || {})

    for (const q of questions) {
      const t = (q.type || '').toLowerCase()
      const qid = q.id
      const label = q.label || ''

      if (t === 'select' || t === 'multiselect' || t === 'checkboxes') {
        const options = (q.options || []) as string[]
        const countsMap = new Map<string, number>()
        for (const opt of options) countsMap.set(opt, 0)

        for (const ans of answersList) {
          const v = (ans as any)[qid]
          if (v == null) continue
          if (Array.isArray(v)) {
            for (const item of v) {
              const key = String(item)
              countsMap.set(key, (countsMap.get(key) || 0) + 1)
            }
          } else {
            const key = String(v)
            countsMap.set(key, (countsMap.get(key) || 0) + 1)
          }
        }
        const totals = options.map((o) => ({ option: o, count: countsMap.get(o) || 0 }))
        stats.push({ id: qid, label, kind: t as any, totals })
        continue
      }

      if (t === 'checkbox' || t === 'boolean') {
        let yes = 0, no = 0
        for (const ans of answersList) {
          const v = (ans as any)[qid]
          if (v === true) yes++
          else if (v === false) no++
        }
        stats.push({ id: qid, label, kind: 'boolean', totals: [{ option: 'Yes', count: yes }, { option: 'No', count: no }] })
        continue
      }

      // text/textarea: count responses
      let responses = 0
      for (const ans of answersList) {
        const v = (ans as any)[qid]
        if (v != null && String(v).trim() !== '') responses++
      }
      stats.push({ id: qid, label, kind: 'text', responses })
    }

    // order by question position if available
    const withPos = questions.reduce<Record<string, number>>((m, q) => { m[q.id] = q.position ?? 0; return m }, {})
    stats.sort((a, b) => (withPos[a.id] ?? 0) - (withPos[b.id] ?? 0))
    return stats
  }, [questions, regs])

  /* ----- CSV import for expected registrants ----- */
  const handleFile = async (file: File) => {
    setErr(null)
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      if (ext === 'csv' || file.type === 'text/csv') {
        const txt = await file.text()
        const rows = parseCSV(txt)
        if (!rows.length) throw new Error('Empty CSV')
        const header = rows[0].map(h => h.trim().toLowerCase())
        const nameIdx = header.findIndex(h => ['name','full name'].includes(h))
        const emailIdx = header.findIndex(h => ['email','e-mail'].includes(h))
        const deptIdx = header.findIndex(h => ['dept','department'].includes(h))
        if (nameIdx === -1 || emailIdx === -1) throw new Error('CSV must have "name" and "email" columns')

        const data: Array<{name:string; email:string; dept?:string}> = []
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i]
          const name = (r[nameIdx] || '').trim()
          const email = (r[emailIdx] || '').trim()
          if (!name || !email) continue
          const dept = deptIdx >= 0 ? (r[deptIdx] || '').trim() : ''
          data.push({ name, email, dept })
        }
        if (!data.length) throw new Error('No data rows found')
        setPreview(data)
        setImportOpen(true)
        return
      }
      throw new Error('Unsupported file. Please upload a CSV with "name" and "email" columns.')
    } catch (e:any) {
      setErr(e.message || 'Parse failed')
    }
  }

  const doImport = async () => {
    if (!eventId || !preview.length) return
    try {
      const res = await fetch('/api/admin/expected', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, rows: preview })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Import failed')
      setImportOpen(false)
      setPreview([])
      // refresh expected stats only
      const sRes = await fetch(`/api/admin/insights?eventId=${encodeURIComponent(eventId)}`, { headers })
      const sJson = await sRes.json()
      if (!sRes.ok) throw new Error(sJson.error || 'Failed to refresh expected stats')
      setExpectedStats(sJson)
      alert(`Imported ${json.insertedOrUpdated} row(s).`)
    } catch (e:any) {
      setErr(e.message || 'Import failed')
    }
  }

  const exportMissingCSV = () => {
    if (!expectedStats?.expected_missing?.length) return
    const header: string[] = ['name', 'email', 'dept']
    const data: string[][] = (expectedStats.expected_missing as any[]).map((r) => [
      String(r.name || ''), String(r.email || ''), String(r.dept || ''),
    ])
    const rows: string[][] = [header, ...data]
    const csv = rows
      .map((r: string[]) => r.map((v: string) => `"${v.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'expected-not-registered.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ----- UI states ----- */
  if (!ok) {
    return (
      <main className="max-w-sm mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-3">Admin — Insights</h1>
        <p className="text-sm text-gray-600">Enter your admin secret (ENV: <code>ADMIN_SECRET</code>).</p>
        <input
          type="password"
          className="mt-3 w-full border rounded-xl px-3 py-2 text-sm"
          value={secret}
          onChange={(e)=>setSecret(e.target.value)}
          placeholder="Paste admin secret"
        />
        <div className="mt-3">
          <button
            className="px-4 py-2 rounded-xl border text-sm"
            onClick={()=>{ localStorage.setItem('admin_secret', secret); setOk(true) }}
          >
            Continue
          </button>
        </div>
      </main>
    )
  }

  if (!eventId) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-gray-600 mt-2">Open this page via the Admin Events list (“Insights” button) so the <code>eventId</code> is provided.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {event?.title || 'Insights'}
          </h1>
          <p className="text-sm text-gray-600">
            {event?.start_at ? format(new Date(event.start_at), 'PPP p') : 'TBA'}
            {event?.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-3 py-2 rounded-xl border text-sm cursor-pointer">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e)=>{ const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </label>
          <button onClick={fetchAll} className="px-3 py-2 rounded-xl border text-sm">Refresh</button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}

      {/* Summary cards */}
      <div className="mt-4 grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card label="Capacity" value={counts.capacity} />
        <Card label="Confirmed" value={counts.confirmed} />
        <Card label="Waitlisted" value={counts.waitlisted} />
        <Card label="Cancelled" value={counts.cancelled} />
        <Card label="Attended" value={counts.attended} />
        <Card label="Seats left" value={counts.seatsLeft} />
      </div>

      {/* Per-question tallies (e.g., T-shirt counts) */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold">By question</h3>
        <div className="mt-2 grid sm:grid-cols-2 gap-4">
          {questionStats.map((qs) => (
            <div key={qs.id} className="rounded-2xl border bg-white p-4">
              <p className="text-sm font-medium">{qs.label}</p>
              {qs.kind === 'text' ? (
                <p className="text-sm text-gray-600 mt-2">{qs.responses ?? 0} response(s)</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {(qs.totals || []).map((t) => {
                    const totalRegs = Math.max(regs.filter(r => r.status !== 'cancelled').length, 1)
                    const pct = Math.round((t.count / totalRegs) * 100)
                    return (
                      <div key={t.option}>
                        <div className="flex items-center justify-between text-xs">
                          <span>{t.option}</span>
                          <span>{t.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded">
                          <div className="h-2 rounded bg-gray-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {questionStats.length === 0 && (
            <div className="text-sm text-gray-600">No custom questions yet.</div>
          )}
        </div>
      </div>

      {/* Expected vs Registered section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold">Expected vs. registered</h3>
        <div className="mt-2 grid sm:grid-cols-3 gap-3">
          <Card label="Expected" value={expectedStats?.expected_total ?? '—'} />
          <Card label="Registered" value={expectedStats?.registered_total ?? '—'} />
          <Card label="Not yet registered" value={expectedStats?.missing_total ?? '—'} />
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold">Not yet registered</h4>
            <button
              disabled={!expectedStats?.expected_missing?.length}
              onClick={exportMissingCSV}
              className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
          <div className="mt-2 max-h-96 overflow-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Dept</th>
                </tr>
              </thead>
              <tbody>
                {(expectedStats?.expected_missing || []).map((r: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.email}</td>
                    <td className="p-2">{r.dept || ''}</td>
                  </tr>
                ))}
                {(!expectedStats?.expected_missing || expectedStats.expected_missing.length === 0) && (
                  <tr><td colSpan={3} className="p-2 text-gray-600">All expected registrants have registered.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Import preview modal */}
      <Modal open={importOpen} onClose={()=>setImportOpen(false)} title="Import preview">
        <p className="text-sm text-gray-700 mb-2">
          We detected {preview.length} row(s). Click Import to upsert into this event’s expected list.
        </p>
        <div className="max-h-72 overflow-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Dept</th></tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{r.dept || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 rounded-lg border text-xs" onClick={()=>setImportOpen(false)}>Cancel</button>
          <button className="px-3 py-1.5 rounded-lg border text-xs" onClick={doImport}>Import</button>
        </div>
      </Modal>
    </main>
  )
}

/* ---------------- Small Card ---------------- */
function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

/* ---------------- Page wrapper with Suspense ---------------- */
export default function InsightsPage() {
  return (
    <Suspense fallback={<main className="max-w-5xl mx-auto p-6">Loading…</main>}>
      <InsightsInner />
    </Suspense>
  )
}
