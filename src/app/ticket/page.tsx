'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic' // avoid prerender errors

function TicketInner() {
  const search = useSearchParams()
  const code = search.get('code')
  const [qr, setQr] = useState<string>('')

  useEffect(() => {
    (async () => {
      if (!code) return
      const url = `${window.location.origin}/checkin?code=${code}`
      // @ts-ignore - local stub or dev types are fine
      const mod = await import('qrcode')
      const QRCode: any = (mod as any).default || mod
      const dataUrl = await QRCode.toDataURL(url)
      setQr(dataUrl)
    })()
  }, [code])

  if (!code) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-semibold mb-2">Ticket</h1>
        <p className="text-sm text-gray-600">Missing ticket code.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">Your Ticket</h1>
      <p className="text-sm text-gray-600 mb-4">Show this at check-in.</p>
      {qr ? <img src={qr} alt="QR code" className="mx-auto border rounded-xl" /> : <p>Generating QR…</p>}
      <p className="text-xs text-gray-500 mt-4 break-all">Code: {code}</p>
    </main>
  )
}

export default function TicketPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md p-6">Loading…</main>}>
      <TicketInner />
    </Suspense>
  )
}
