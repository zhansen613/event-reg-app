import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev'

export async function sendMail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('Missing RESEND_API_KEY; skip sending email.')
    return
  }
  const resend = new Resend(RESEND_API_KEY)
  await resend.emails.send({ from: EMAIL_FROM, to, subject, html })
}
