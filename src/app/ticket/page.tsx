'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'

function TicketInner() {
  const sp = useSearchParams()
  const token = sp.get('t') || '' // registrationId
  const autodl = sp.get('autodl') === '1'
  const [dataUrl, setDataUrl] = useState<string>('')

  const checkinUrl = useMemo(() => {
    if (typeof window === 'undefined' || !token) return ''
    const origin = window.location.origin
    return `${origin}/checkin?code=${encodeURIComponent(token)}`
  }, [token])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!checkinUrl) return
      try {
        const url = await QRCode.toDataURL(checkinUrl, { width: 480, margin: 1 })
        if (!cancelled) setDataUrl(url)
      } catch (e) {
        console.error('QR gen failed', e)
      }
    })()
    return () => { cancelled = true }
  }, [checkinUrl])

  useEffect(() => {
    if (!dataUrl || !autodl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'ticket-qr.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [dataUrl, autodl])

  if (!token) {
    return (
      <main className="max-w-md mx-auto p-6">
        <h1 className="text-xl font-semibold">Ticket</h1>
        <p className="mt-2 text-sm text-gray-700">Missing ticket token.</p>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold">Your Ticket QR</h1>
      <p className="mt-2 text-sm text-gray-600">Present this at check-in.</p>
      <div className="mt-4 rounded-2xl border bg-white p-4 flex items-center justify-center">
        {dataUrl ? <img src={dataUrl} alt="Ticket QR" className="w-64 h-64" /> : 'Generating…'}
      </div>
      <div className="mt-4 flex gap-2">
        {dataUrl && (
          <a
            href={dataUrl}
            download="ticket-qr.png"
            className="px-4 py-2 rounded-xl border text-sm"
          >
            Download QR
          </a>
        )}
        <a
          href={checkinUrl}
          className="px-4 py-2 rounded-xl border text-sm"
        >
          Test Check-in Link
        </a>
      </div>
    </main>
  )
}

export default function TicketPage() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto p-6">Loading…</main>}>
      <TicketInner />
    </Suspense>
  )
}
