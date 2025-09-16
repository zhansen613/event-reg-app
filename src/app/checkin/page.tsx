'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function CheckinInner() {
  const sp = useSearchParams()
  const initialCode =
    sp.get('code') || // preferred
    sp.get('t') ||    // fallback
    ''

  const [secret, setSecret] = useState('')
  const [code, setCode] = useState(initialCode)
  const [status, setStatus] = useState<'idle'|'ok'|'err'|'working'>('idle')
  const [message, setMessage] = useState<string>('')

  // Load admin secret from previous use (same as Admin UI)
  useEffect(() => {
    const s = localStorage.getItem('admin_secret')
    if (s) setSecret(s)
  }, [])

  // Keep in sync if query changes
  useEffect(() => { if (initialCode) setCode(initialCode) }, [initialCode])

  const canSubmit = useMemo(() => !!secret && !!code, [secret, code])

  const markAttended = async () => {
    if (!canSubmit) {
      setStatus('err'); setMessage('Missing admin secret or code.')
      return
    }
    setStatus('working'); setMessage('')
    try {
      const res = await fetch(`/api/admin/registrations/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        headers: {
          'x-admin-secret': secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attended: true,
          checkin_at: new Date().toISOString(),
        }),
      })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      // Persist secret for next time
      localStorage.setItem('admin_secret', secret)
      setStatus('ok'); setMessage('Marked attended. ✅')
    } catch (e:any) {
      setStatus('err'); setMessage(e?.message || 'Failed to check in')
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold">Check-in</h1>
      <p className="text-sm text-gray-600 mt-1">Scan a ticket QR or paste the code below.</p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Admin Secret</label>
          <input
            type="password"
            className="border rounded-xl px-3 py-2 text-sm"
            value={secret}
            onChange={(e)=>setSecret(e.target.value)}
            placeholder="Paste ADMIN_SECRET"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm">Code</label>
          <input
            className="border rounded-xl px-3 py-2 text-sm"
            value={code}
            onChange={(e)=>setCode(e.target.value.trim())}
            placeholder="Auto-filled from QR; otherwise paste registration ID"
          />
          <p className="text-xs text-gray-500">
            This is the registration ID encoded in the QR (via <code>?code=...</code>).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAttended}
            disabled={!canSubmit || status === 'working'}
            className="px-4 py-2 rounded-xl border text-sm disabled:opacity-50"
          >
            {status === 'working' ? 'Marking…' : 'Mark Attended'}
          </button>
        </div>

        {status !== 'idle' && (
          <p className={`text-sm ${status === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    </main>
  )
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto p-6">Loading…</main>}>
      <CheckinInner />
    </Suspense>
  )
}
