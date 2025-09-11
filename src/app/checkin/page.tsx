'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function CheckinPage() {
  const search = useSearchParams()
  const code = search.get('code') || ''
  const [secret, setSecret] = useState<string>('')
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    const s = localStorage.getItem('admin_secret')
    if (s) setSecret(s)
  }, [])

  const headers = useMemo(() => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' }), [secret])

  const handleCheckin = async () => {
    setStatus('Checking in…')
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ code })
    })
    const json = await res.json()
    setStatus(json.message || json.error || 'Done')
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-2">Check-in</h1>
      {!code && <p className="text-sm text-gray-600 mb-4">Scan a QR (or open a link with ?code=...).</p>}

      <label className="text-sm">Admin Secret</label>
      <input
        type="password"
        value={secret}
        onChange={(e)=>{ setSecret(e.target.value); localStorage.setItem('admin_secret', e.target.value) }}
        className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
        placeholder="Paste the ADMIN_SECRET"
      />

      <div className="mt-4">
        <label className="text-sm">Code</label>
        <input
          value={code}
          readOnly
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-gray-50"
        />
      </div>

      <button
        onClick={handleCheckin}
        disabled={!code || !secret}
        className="mt-4 px-4 py-2 rounded-xl border text-sm"
      >
        Mark as attended
      </button>

      {status && <p className="text-sm mt-3">{status}</p>}
    </main>
  )
}
