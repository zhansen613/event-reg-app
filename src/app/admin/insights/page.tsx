'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic' // always live

type Q = {
  id: string
  label: string
  type: 'short_text' | 'long_text' | 'select' | 'multiselect' | 'checkbox'
  required: boolean
  options?: string[] | null
}

type RegRow = {
  id: string
  status: 'confirmed' | 'waitlisted' | 'cancelled'
  attended?: boolean
  answers?: Record<string, unknown>
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-auto border rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map(h => <th key={h} className="text-left p-2">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="p-2 text-gray-500" colSpan={headers.length}>No data yet.</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => <td key={j} className="p-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InsightsInner() {
  const sp = useSearchParams()
  const eventId = sp.get('eventId') || ''

  const [secret, setSecret] = useState('')
  const [eventTitle, setEventTitle] = useState<string>('')
  const [questions, setQuestions] = useState<Q[]>([])
  const [regs, setRegs] = useState<RegRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const s = localStorage.getItem('admin_secret')
    if (s) setSecret(s)
  }, [])

  const headers = useMemo(() => ({ 'x-admin-secret': secret }), [secret])

  const load = async () => {
    if (!eventId || !secret) return
    setLoading(true)
    setErr(null)
    try {
      // events (to get the title)
      const evRes = await fetch('/api/admin/events', { headers })
      const evJson = await evRes.json()
      const ev = (evJson.events || []).find((e: any) => e.id === eventId)
      setEventTitle(ev?.title || 'Event')

      // questions
      const qRes = await fetch(`/api/admin/questions?eventId=${eventId}`, { headers })
      const qJson = await qRes.json()
      setQuestions(qJson.questions || [])

      // registrations
      const rRes = await fetch(`/api/admin/registrations?eventId=${eventId}`, { headers })
      const rJson = await rRes.json()
      setRegs(rJson.registrations || [])
    } catch (e: any) {
      setErr(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventId, secret])

  // Top-line stats
  const total = regs.length
  const confirmed = regs.filter(r => r.status === 'confirmed').length
  const waitlisted = regs.filter(r => r.status === 'waitlisted').length
  const attended = regs.filter(r => r.attended).length

  // Build totals per question (select/multiselect/checkbox)
  type Totals = { [label: string]: number }
  const perQuestion: Array<{ q: Q; rows: [string, number][] }> = useMemo(() => {
    const out: Array<{ q: Q; rows: [string, number][] }> = []
    for (const q of questions) {
      if (q.type === 'select' || q.type === 'multiselect' || q.type === 'checkbox') {
        const counts: Totals = {}
        const ensure = (k: string) => { counts[k] = (counts[k] || 0) }

        if (q.type === 'checkbox') {
          // yes / no / no answer
          counts['Yes'] = 0
          counts['No'] = 0
          counts['No answer'] = 0
          for (const r of regs) {
            const v = (r.answers || {})[q.id]
            if (v === undefined || v === null) counts['No answer']++
            else counts[v === true ? 'Yes' : 'No']++
          }
        } else {
          // select / multiselect
          const opts = (q.options || []) as string[]
          for (const opt of opts) counts[opt] = 0
          counts['Other'] = 0
          counts['No answer'] = 0

          for (const r of regs) {
            const v = (r.answers || {})[q.id]
            if (v === undefined || v === null || (Array.isArray(v) && v.length === 0) || v === '') {
              counts['No answer']++
              continue
            }
            if (q.type === 'select') {
              const val = String(v)
              if (opts.includes(val)) counts[val]++
              else counts['Other']++
            } else {
              // multiselect
              const arr = Array.isArray(v) ? v as any[] : [v]
              if (arr.length === 0) { counts['No answer']++; continue }
              for (const item of arr) {
                const val = String(item)
                if (opts.includes(val)) counts[val]++
                else counts['Other']++
              }
            }
          }
        }

        // Turn into rows sorted by count desc, but keep "No answer" at end
        const rows = Object.entries(counts)
          .sort((a, b) => {
            if (a[0] === 'No answer') return 1
            if (b[0] === 'No answer') return -1
            return b[1] - a[1]
          }) as [string, number][]
        out.push({ q, rows })
      }
    }
    return out
  }, [questions, regs])

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Insights — {eventTitle}</h1>
        <div className="flex gap-2">
          <a href={`/admin`} className="px-3 py-2 rounded-xl border text-sm">Back</a>
          <button onClick={load} className="px-3 py-2 rounded-xl border text-sm">Refresh</button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
      {loading && <p className="text-sm">Loading…</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card title="Total registrations" value={total} />
        <Card title="Confirmed" value={confirmed} />
        <Card title="Waitlisted" value={waitlisted} />
        <Card title="Attended" value={attended} />
      </div>

      {perQuestion.length === 0 ? (
        <p className="text-sm text-gray-600">No countable questions yet. Add questions of type <i>Select</i>, <i>Multi-select</i>, or <i>Checkbox</i>.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {perQuestion.map(({ q, rows }) => (
            <div key={q.id} className="rounded-2xl border p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">{q.label}</h3>
                <span className="text-xs rounded-full border px-2 py-0.5">{q.type}</span>
              </div>
              <Table headers={['Option', 'Count']} rows={rows} />
            </div>
          ))}
        </div>
      )}

      {/* Optional: show counts of text questions as number of responses */}
      {questions.some(q => q.type === 'short_text' || q.type === 'long_text') && (
        <div className="rounded-2xl border p-4 bg-white mt-6">
          <h3 className="text-base font-semibold mb-2">Open-ended questions</h3>
          <ul className="text-sm list-disc pl-5">
            {questions.filter(q => q.type === 'short_text' || q.type === 'long_text').map(q => {
              let count = 0
              for (const r of regs) {
                const v = (r.answers || {})[q.id]
                if (v !== undefined && v !== null && String(v).trim() !== '') count++
              }
              return <li key={q.id}><b>{q.label}:</b> {count} response{count === 1 ? '' : 's'}</li>
            })}
          </ul>
        </div>
      )}
    </main>
  )
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl p-6">Loading…</main>}>
      <InsightsInner />
    </Suspense>
  )
}
