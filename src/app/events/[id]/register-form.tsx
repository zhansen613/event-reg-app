'use client'

import { useMemo, useState } from 'react'

type Question = {
  id: string
  label: string
  type: string
  required?: boolean
  options?: string[] | null
}

type DoneResult = {
  ok: boolean
  status: 'confirmed' | 'waitlisted'
  registrationId?: string
  ticketUrl?: string | null
  error?: string
}

export default function RegisterForm({
  eventId,
  isFull,
  seatsLeft,
  questions,
}: {
  eventId: string
  isFull: boolean
  seatsLeft: number
  questions: Question[]
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dept, setDept] = useState('')

  const initialAnswers = useMemo(() => {
    const base: Record<string, any> = {}
    for (const q of questions) {
      switch ((q.type || '').toLowerCase()) {
        case 'checkbox':
        case 'checkboxes':
        case 'multiselect':
          base[q.id] = []
          break
        case 'boolean':
          base[q.id] = false
          break
        default:
          base[q.id] = ''
      }
    }
    return base
  }, [questions])

  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<DoneResult | null>(null)

  const setAnswer = (qid: string, val: any) => {
    setAnswers((a) => ({ ...a, [qid]: val }))
  }

  const toggleMulti = (qid: string, opt: string) => {
    setAnswers((a) => {
      const cur: string[] = Array.isArray(a[qid]) ? a[qid] : []
      const has = cur.includes(opt)
      return { ...a, [qid]: has ? cur.filter((x) => x !== opt) : [...cur, opt] }
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setDone(null)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name,
          email,
          dept: dept || undefined,
          answers,
        }),
      })

      // Parse JSON if possible, else grab raw text for error display
      let json: DoneResult | null = null
      let text = ''
      try { json = (await res.json()) as DoneResult } catch { text = await res.text() }

      if (!res.ok || !json?.ok) {
        const msg = (json && json.error) || text || `HTTP ${res.status}`
        throw new Error(msg)
      }

      setDone(json)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-white p-4">
        {done.status === 'confirmed' ? (
          <>
            <h3 className="text-lg font-semibold">Registration confirmed</h3>
            <p className="mt-1 text-sm text-gray-700">
              We’ve sent a confirmation email with your ticket.
            </p>

            {/* Big download button + helper text */}
            <div className="mt-4 rounded-2xl border bg-white p-4">
              <p className="text-sm text-gray-800">
                <strong>Please download your mobile ticket QR code.</strong>
                <br />
                This is your ticket to entry <strong>Rise Together</strong>. Please do not discard.
              </p>

              <a
                href={`${(done.ticketUrl || '#')}${(done.ticketUrl || '').includes('?') ? '&' : '?'}autodl=1`}
                className="inline-block mt-3 px-4 py-2 rounded-xl border text-sm font-semibold"
              >
                Download QR Code
              </a>
            </div>

            {/* Optional: plain “View ticket” link */}
            {done.ticketUrl && (
              <p className="mt-3 text-sm">
                Or <a className="underline" href={done.ticketUrl}>view your ticket</a>.
              </p>
            )}
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold">You’re on the waitlist</h3>
            <p className="mt-1 text-sm text-gray-700">
              We’ll email you if a spot opens up. No ticket is issued yet.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-4">
      <h3 className="text-lg font-semibold">
        {isFull ? 'Join waitlist' : 'Register'}
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        {isFull ? 'This event is currently full.' : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`}
      </p>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Full name</label>
          <input
            className="border rounded-xl px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Email</label>
          <input
            type="email"
            className="border rounded-xl px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-sm">Department (optional)</label>
          <input
            className="border rounded-xl px-3 py-2 text-sm"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          />
        </div>

        {/* Custom questions */}
        {questions.map((q) => {
          const t = (q.type || '').toLowerCase()
          const opts = (q.options || []) as string[]
          const qid = q.id

          if (t === 'textarea') {
            return (
              <div key={qid} className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-sm">
                  {q.label} {q.required ? '*' : ''}
                </label>
                <textarea
                  rows={3}
                  className="border rounded-xl px-3 py-2 text-sm"
                  value={answers[qid] || ''}
                  onChange={(e) => setAnswer(qid, e.target.value)}
                  required={!!q.required}
                />
              </div>
            )
          }

          if (t === 'select') {
            return (
              <div key={qid} className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-sm">
                  {q.label} {q.required ? '*' : ''}
                </label>
                <select
                  className="border rounded-xl px-3 py-2 text-sm"
                  value={answers[qid] || ''}
                  onChange={(e) => setAnswer(qid, e.target.value)}
                  required={!!q.required}
                >
                  <option value="">Select…</option>
                  {opts.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            )
          }

          if (t === 'multiselect' || t === 'checkboxes') {
            const selected: string[] = Array.isArray(answers[qid]) ? answers[qid] : []
            return (
              <div key={qid} className="sm:col-span-2">
                <label className="text-sm">
                  {q.label} {q.required ? '*' : ''}
                </label>
                <div className="mt-1 flex flex-wrap gap-3">
                  {opts.map((o) => (
                    <label key={o} className="text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(o)}
                        onChange={() => toggleMulti(qid, o)}
                      />
                      {o}
                    </label>
                  ))}
                </div>
              </div>
            )
          }

          if (t === 'checkbox' || t === 'boolean') {
            return (
              <div key={qid} className="sm:col-span-2">
                <label className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!answers[qid]}
                    onChange={(e) => setAnswer(qid, e.target.checked)}
                  />
                  {q.label} {q.required ? '*' : ''}
                </label>
              </div>
            )
          }

          // default: text
          return (
            <div key={qid} className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-sm">
                {q.label} {q.required ? '*' : ''}
              </label>
              <input
                className="border rounded-xl px-3 py-2 text-sm"
                value={answers[qid] || ''}
                onChange={(e) => setAnswer(qid, e.target.value)}
                required={!!q.required}
              />
            </div>
          )
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl border text-sm"
        >
          {submitting ? 'Submitting…' : isFull ? 'Join waitlist' : 'Register'}
        </button>
      </div>
    </form>
  )
}
