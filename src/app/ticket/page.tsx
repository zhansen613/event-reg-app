'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'

function TicketInner() {
  const search = useSearchParams()
  const token = search.get('t') || ''      // existing secure token from email / API
  const auto = search.get('autodl') === '1'
  const [dataUrl, setDataUrl] = useState<string>('')

  // Generate QR once we have a token
  useEffect(() => {
    let mounted = true
    async function run() {
      if (!token) return
      const url = `${window.location.origin}/checkin?t=${encodeURIComponent(token)}`
      const png = await QRCode.toDataURL(url, { margin: 1, scale: 6 })
      if (mounted) setDataUrl(png)
    }
    run()
    return () => { mounted = false }
  }, [token])

  const handleDownload = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'RiseTogether-ticket.png'
    a.click()
  }

  // Auto-download when param autodl=1 is present
  useEffect(() => {
    if (auto && dataUrl) {
      handleDownload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, dataUrl])

  if (!token) {
    return (
      <main className="max-w-md mx-auto p-6">
        <h1 className="text-xl font-semibold">Ticket</h1>
        <p className="mt-2 text-sm text-gray-700">
          Missing ticket token. Please open the link from your confirmation email.
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold">Your ticket</h1>

      <div className="mt-3 rounded-2xl border bg-white p-3 flex flex-col items-center">
        {dataUrl ? (
          // Preview
          <img src={dataUrl} alt="QR code" className="w-64 h-64 object-contain" />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center text-sm text-gray-500">Generating…</div>
        )}

        {/* Download helper text + button */}
        <p className="mt-4 text-sm text-gray-800 text-center">
          <strong>Please download your mobile ticket QR code.</strong><br />
          This is your ticket to entry <strong>Rise Together</strong>. Please do not discard.
        </p>

        <button
          onClick={handleDownload}
          disabled={!dataUrl}
          className="mt-3 px-4 py-2 rounded-xl border text-sm font-semibold"
        >
          Download QR Code
        </button>
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
