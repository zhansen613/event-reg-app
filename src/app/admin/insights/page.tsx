'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

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
      else if (ch === '\r') { /* swallow */ }
      else cur += ch
    }
  }
  // tail
  row.push(cur)
  rows.push(row)
  // trim trailing empty line if present
  if (rows.length && rows[rows.length-1].every(c => c === '')) rows.pop()
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

function InsightsInner() {
  const search = useSearchParams()
  const eventId = search.get('eventId') || ''
  const { ok, secret, headers, setSecret, setOk } = useAdminHeaders()

  const [stats, setStats] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [preview, setPreview] = useState<Array<{name: string; email: string; dept?: string}>>([])

  const fetchStats = async () => {
    if (!eventId) return
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/insights?eventId=${encodeURIComponent(eventId)}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Fetch failed')
      setStats(json)
    } catch (e:any) {
      setErr(e.message || 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (ok && eventId) fetchStats() }, [ok, eventId])

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

      // Excel support (optional): un-comment after adding "xlsx" dependency and a module declaration
      // const XLSX: any = await import('xlsx')
      // const buf = await file.arrayBuffer()
      // const wb = XLSX.read(buf)
      // const ws = wb.Sheets[wb.SheetNames[0]]
      // const json = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]
      // const mapped = json.map(row => ({
      //   name: String(row.name || row.Name || row['Full Name'] || '').trim(),
      //   email: String(row.email || row.Email || row['E-mail'] || '').trim(),
      //   dept: String(row.dept || row.department || row.Department || '').trim()
      // })).filter(r => r.name && r.email)
      // if (!mapped.length) throw new Error('No rows with name+email found')
      // setPreview(mapped)
      // setImportOpen(true)
      // return

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
      await fetchStats()
      alert(`Imported ${json.insertedOrUpdated} row(s).`)
    } catch (e:any) {
      setErr(e.message || 'Import failed')
    }
  }

  const exportMissingCSV = () => {
    if (!stats?.expected_missing?.length) return

    const header: string[] = ['name', 'email', 'dept']
    const data: string[][] = (stats.expected_missing as any[]).map((r) => [
      String(r.name || ''),
      String(r.email || ''),
      String(r.dept || ''),
    ])
    const rows: string[][] = [header, ...data]

    // Explicitly type the map params so TS doesn't infer `any`
    const csv = rows
      .map((r: string[]) =>
        r.map((v: string) => `"${v.replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'expected-not-registered.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Insights</h1>
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
          <button onClick={fetchStats} className="px-3 py-2 rounded-xl border text-sm">Refresh</button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">Expected</p>
          <p className="text-2xl font-semibold">{stats?.expected_total ?? '—'}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">Registered</p>
          <p className="text-2xl font-semibold">{stats?.registered_total ?? '—'}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">Not yet registered</p>
          <p className="text-2xl font-semibold">{stats?.missing_total ?? '—'}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Not yet registered</h3>
          <button
            disabled={!stats?.expected_missing?.length}
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
              {(stats?.expected_missing || []).map((r:any, i:number) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{r.dept || ''}</td>
                </tr>
              ))}
              {(!stats?.expected_missing || stats.expected_missing.length === 0) && (
                <tr><td colSpan={3} className="p-2 text-gray-600">All expected registrants have registered.</td></tr>
              )}
            </tbody>
          </table>
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

export default function InsightsPage() {
  return (
    <Suspense fallback={<main className="max-w-5xl mx-auto p-6">Loading…</main>}>
      <InsightsInner />
    </Suspense>
  )
}
