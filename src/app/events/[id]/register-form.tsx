'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Q = { id: string; label: string; type: string; required: boolean; options?: string[] | null }

export default function RegisterForm({
  eventId, isFull, seatsLeft, questions
}: { eventId: string; isFull: boolean; seatsLeft: number; questions: Q[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dept, setDept] = useState('')
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const setAns = (id:string, value:any) => setAnswers(a => ({ ...a, [id]: value }))

  const validate = () => {
    for (const q of questions) {
      if (!q.required) continue
      const v = answers[q.id]
      if (q.type === 'multiselect') {
        if (!Array.isArray(v) || v.length === 0) return `${q.label} is required`
      } else if (q.type === 'checkbox') {
        if (!v) return `${q.label} is required`
      } else {
        if (!v || String(v).trim() === '') return `${q.label} is required`
      }
    }
    return null
  }

  const submit = async () => {
    setLoading(true)
    setStatus(null)
    const err = validate()
    if (err) { setStatus(err); setLoading(false); return }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ eventId, name, email, dept, answers })
      })
      const json = await res.json()
      setStatus(json.message || json.error)
      router.refresh() // refresh seats, etc.
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border p-4">
      <p className="text-sm mb-2">
        {isFull ? 'This event is full. Join the waitlist.' : `${seatsLeft} seats left`}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Full name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="border rounded-xl px-3 py-2 text-sm sm:col-span-2" placeholder="Department (optional)" value={dept} onChange={(e)=>setDept(e.target.value)} />

        {/* Custom Questions */}
        {questions.map((q) => (
          <div key={q.id} className={q.type === 'long_text' ? 'sm:col-span-2' : ''}>
            <label className="text-sm">{q.label}{q.required && ' *'}</label>
            {q.type === 'short_text' && (
              <input className="mt-1 border rounded-xl px-3 py-2 text-sm w-full"
                     value={answers[q.id] || ''} onChange={(e)=>setAns(q.id, e.target.value)} />
            )}
            {q.type === 'long_text' && (
              <textarea rows={3} className="mt-1 border rounded-xl px-3 py-2 text-sm w-full"
                        value={answers[q.id] || ''} onChange={(e)=>setAns(q.id, e.target.value)} />
            )}
            {q.type === 'select' && (
              <select className="mt-1 border rounded-xl px-3 py-2 text-sm w-full"
                      value={answers[q.id] || ''} onChange={(e)=>setAns(q.id, e.target.value)}>
                <option value="">Select…</option>
                {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
            {q.type === 'multiselect' && (
              <div className="mt-1 flex flex-wrap gap-2">
                {(q.options || []).map(opt => {
                  const arr = Array.isArray(answers[q.id]) ? answers[q.id] : []
                  const checked = arr.includes(opt)
                  return (
                    <label key={opt} className="inline-flex items-center gap-1 text-sm border rounded-lg px-2 py-1">
                      <input type="checkbox" checked={checked}
                             onChange={(e)=>{
                               const next = new Set(arr)
                               e.target.checked ? next.add(opt) : next.delete(opt)
                               setAns(q.id, Array.from(next))
                             }} />
                      {opt}
                    </label>
                  )
                })}
              </div>
            )}
            {q.type === 'checkbox' && (
              <div className="mt-1">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!answers[q.id]} onChange={(e)=>setAns(q.id, e.target.checked)} />
                  {q.label}
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button disabled={loading} onClick={submit} className="px-4 py-2 rounded-xl text-sm border">
          {isFull ? 'Join Waitlist' : 'Register'}
        </button>
      </div>
      {status && <p className="text-sm mt-3">{status}</p>}
    </div>
  )
}
