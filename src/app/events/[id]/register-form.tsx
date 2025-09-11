'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterForm({
  eventId,
  isFull,
  seatsLeft,
}: { eventId: string; isFull: boolean; seatsLeft: number }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dept, setDept] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ eventId, name, email, dept }),
      })
      const json = await res.json()
      setStatus(json.message || json.error)
      // pull fresh counts & UI from the server
      router.refresh()
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
        <input
          className="border rounded-xl px-3 py-2 text-sm"
          placeholder="Full name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />
        <input
          className="border rounded-xl px-3 py-2 text-sm"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />
        <input
          className="border rounded-xl px-3 py-2 text-sm sm:col-span-2"
          placeholder="Department (optional)"
          value={dept}
          onChange={(e)=>setDept(e.target.value)}
        />
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
