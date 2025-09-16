Event Registration App

A production-ready web app for creating events, collecting registrations, issuing QR tickets, and checking in attendees — with an admin console, insights dashboard, and CSV tools. Built with Next.js + Supabase + Vercel.

Status: V1 shipped ✅ — see Releases for v1.0.0 notes.

✨ Features

Public site

Landing page with hero image and Markdown intro.
Event cards (published = live; unpublished render “Coming Soon”).
Event detail page with image, description, Markdown registration blurb, and form.
Capacity + waitlist logic out of the box.
Optional gate question (“Are you attending…?”) — if No, hides the rest and records a polite cancelled RSVP (doesn’t consume a seat).
Tickets, calendar & check-in

QR ticket page (/ticket?t=<registrationId>) with Download QR button.
QR encodes a public check-in URL: /checkin?code=<registrationId>.
Check-in page marks attendees as attended (timestamped).
.ics calendar download endpoint.

Admin console

Events: create/edit/copy/delete; Publish toggle; image upload; capacity/date/location; registration blurb (Markdown).
Questions: per-event dynamic fields (text, textarea, select, multiselect/checkboxes, boolean).
Sections: Agenda, Parking & Transportation, Venue (Markdown).
Registrations: add/promote/cancel; auto-promote waitlist; manual check-in/undo; CSV export (flattened custom questions).
Insights: summary tiles (Capacity, Confirmed, Waitlisted, Cancelled, Attended, Seats left), per-question tallies (e.g., T-shirt sizes), and Expected vs. Registered:
Upload CSV of expected attendees (name,email,dept).
See and export “Not yet registered” list.

Email (pluggable)

Works with Resend or your own SMTP / SES / SendGrid via a small adapter.

🗺️ URLs (default)

Public:

/ — Landing page
/events/[id] — Event page
/ticket?t=<registrationId> — QR ticket (includes Download QR)
/checkin?code=<registrationId> — Check-in (admin secret required)

Admin:

/admin — Events list
/admin/questions?eventId=...
/admin/sections?eventId=...
/admin/insights?eventId=...

APIs (server only):

/api/register — Public registration endpoint
/api/calendar/ics?rid=<registrationId> — ICS download
/api/admin/... — Admin endpoints (guarded by ADMIN_SECRET header)
/img?u=<url> — Simple image proxy (helps with mixed content / firewall issues)

🧱 Tech stack

Next.js (App Router, Server Actions, React 18, Suspense)
Supabase (Postgres, Storage, RLS, SQL views)
Vercel (hosting, serverless functions)
Email adapter (Resend or SMTP/SES/SendGrid)

QRCode (qrcode package) for ticket images

🧩 Architecture (high level)
[ Browser ] ──> Next.js (Vercel)
   |                ├─ Public pages (SSR/ISR)
   |                ├─ /api/register (writes to Supabase)
   |                ├─ /api/calendar/ics (generates .ics)
   |                ├─ /api/admin/* (service-role operations)
   |                └─ /img proxy
   |
[ Supabase Postgres ]
   ├─ events, registrations, event_questions, event_sections
   ├─ site_settings, expected_registrants
   └─ event_counts (view: capacity vs confirmed)

🚀 Quick start (Vercel + Supabase; no local install)

Create a Supabase project
Get SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY from Settings → API.
Create core tables (if you’re starting fresh). See Appendix A for the minimal SQL for expected list + counts view. (Your repo likely already has the other tables.)
Connect the repo to Vercel
Import this GitHub repo in Vercel.
Set environment variables in Vercel

Core

ADMIN_SECRET=long-random-string
PUBLIC_BASE_URL=https://your-domain.com
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...


Email (choose one path)

Resend: RESEND_API_KEY, EMAIL_FROM=events@yourdomain.com

SMTP (M365/Gmail): SMTP_HOST, SMTP_PORT=587, SMTP_USER, SMTP_PASS, SMTP_SECURE=false, EMAIL_FROM=events@yourdomain.com

SES: AWS_SES_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EMAIL_FROM=events@yourdomain.com

SendGrid: SENDGRID_API_KEY, EMAIL_FROM=events@yourdomain.com

Deploy

Vercel will build and deploy automatically.

First use

Visit /admin, paste your ADMIN_SECRET (stored in localStorage).

Create an event, add Questions and Sections, toggle Published, share the link.

🔐 Security & data notes

RLS: Public can read only published event fields and insert into registrations. All admin routes run server-side with service role key; they require x-admin-secret: ADMIN_SECRET.
Admin secret is kept in localStorage for convenience. Rotate it periodically.
Duplicate protection: same (event, email) is blocked unless the previous registration is cancelled.
Gate question (optional): any select whose label starts with “Are you attending”; selecting No stores a cancelled RSVP.
Consider rate limiting /api/register and adding CAPTCHA if you expect high traffic.

🛠️ Development (local)

Requirements: Node 18+, npm (or pnpm/yarn)

Setup:

cp .env.example .env.local    # create and fill with the envs listed above
npm install
npm run dev


Build:

npm run build && npm start

🧪 Admin workflow tips

Publishing: Unpublished events appear grey with “Coming Soon” and block registration.
Copy Event: Duplicates the event (optionally questions/sections/image/blurb).
Registrations:
Add registrant (manual), Cancel (optional auto-promote next waitlisted).
Promote waitlisted to confirmed.
Manual check-in or Undo.
Export CSV with flattened custom answers.

Insights:

Per-question totals (great for shirt sizes).
Upload Expected registrants CSV; view Not yet registered; export that list.
CSV format (expected registrants):

name,email,dept
Jane Smith,jane@example.com,Marketing
John Doe,john@example.com,Sales

✉️ Email adapter

All email sending goes through src/lib/email.ts:
If SMTP envs are present → use Nodemailer (port 587/465; port 25 is blocked on Vercel).
Else if SES envs are present → use AWS SES (HTTPS API).
Else if SendGrid env present → use SendGrid (HTTPS API).
Else if RESEND_API_KEY present → use Resend.
Else → logs to console (dev only).
Make sure EMAIL_FROM aligns with your domain’s SPF/DKIM/DMARC.

🧾 Troubleshooting

“Configuring Next.js via next.config.ts is not supported.”
Rename to next.config.js (or next.config.mjs).

TypeScript: tsconfig.json(...) error TS1012: Unexpected token
JSON must not have comments or trailing commas. Validate your tsconfig.json.

“useSearchParams() should be wrapped in a suspense boundary”
Wrap pages that use useSearchParams() with <Suspense> and (often) add
export const dynamic = 'force-dynamic' at the top of that page.

QR scan opens a Vercel login / wrong page
Ensure the QR encodes https://YOUR_SITE/checkin?code=<registrationId>.
The /ticket page in this repo already does that.

qrcode type error (no declaration file)
Install types: npm i -D @types/qrcode
or add src/types/qrcode.d.ts with: declare module 'qrcode';

Images blocked or broken
Use the built-in /img?u=... proxy (the app already does). If you use Supabase Storage, ensure the bucket/object is set public or served via your own proxy.

📦 Project structure (high level)
src/
  app/
    admin/
      page.tsx              # Events dashboard
      insights/page.tsx     # Insights + CSV expected list
      questions/page.tsx    # Per-event question builder
      sections/page.tsx     # Agenda / Parking / Venue editor
    events/[id]/page.tsx    # Public event page & registration
    ticket/page.tsx         # QR ticket page (download + test link)
    checkin/page.tsx        # Check-in by code (admin secret)
    api/
      register/route.ts
      calendar/ics/route.ts
      admin/...(routes)     # events, registrations, expected, insights, upload, etc.
    img/route.ts            # image proxy
  components/Markdown.tsx   # safe Markdown renderer
  lib/supabase.ts           # client/server helpers
  ...

📅 Roadmap (post-V1 ideas)

Self-serve cancel link in emails (frees a seat; auto-promote).
Reminder emails 24–48h pre-event (Vercel Cron / Supabase scheduled task).
Kiosk/Scanner mode (camera UI + beep on success).
Bulk email to “Not yet registered”.
Badge PDFs (name + QR).
Rate limiting + CAPTCHA on /api/register.
Theme settings (brand color, logo, footer).
Excel upload alongside CSV.

📜 License

Add your preferred license (MIT/Apache-2.0) or keep private.

🙌 Acknowledgments

Next.js, Supabase, Vercel, and the OSS ecosystem.

Internal testers for real-world feedback (capacity/seat math, QR flow, insights).

Appendix A — Minimal SQL (expected list + counts view)
-- Expected registrants (CSV import)
create table if not exists expected_registrants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  email text not null,
  dept text,
  uploaded_at timestamptz not null default now()
);
create unique index if not exists expected_registrants_event_email_key
  on expected_registrants (event_id, email);

-- Fast capacity math (adjust names if your schema differs)
create or replace view event_counts as
select
  e.id,
  e.capacity,
  (
    select count(*)
    from registrations r
    where r.event_id = e.id
      and r.status = 'confirmed'
  ) as confirmed_count
from events e;


RLS: Keep admin writes behind server routes using the service role. Public policies should only allow reading published event data and inserting new registrations.
