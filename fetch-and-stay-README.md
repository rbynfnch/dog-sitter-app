# Fetch & Stay — starter

A React + Supabase scaffold for a dog-sitting scheduling site with real
accounts, a meet-and-greet gate before bookings can be approved, dog
profiles, e-signed (or manually uploaded) contracts, and printable PDFs.

This is a **Phase 1 + Phase 2 scaffold** — it runs, but you'll be extending
it. Everything below is either working code or a clearly marked TODO.

## What's actually implemented

- **Real accounts** via Supabase Auth (email/password). Row Level Security
  (RLS) policies in `supabase/schema.sql` enforce who can see/change what —
  enforced by Postgres itself, not just hidden in the UI. A client can never
  approve their own booking even if they tamper with the browser.
- **Calendar** reads real availability from the database (blocked dates +
  approved bookings only — pending requests don't block anyone else).
- **Request flow**: dog profile + emergency contact + required meet-and-greet
  time, all in one form (`RequestModal.jsx`).
- **Sitter dashboard**: move a booking through
  `meet_requested → meet_scheduled → meet_completed → approved/declined`.
  Only `approved` bookings ever block the calendar.
- **Spam protection, for real**: a Postgres trigger
  (`enforce_request_limit` in schema.sql) blocks a client from having more
  than 3 open requests at once. This runs on the database, so it can't be
  bypassed by editing the frontend.
- **Contract PDF + signature**: `ContractDocument.jsx` renders a real PDF
  (selectable text, not a screenshot) combining the booking, dog profile, and
  emergency contact. Client can type-sign it (stored immediately) or
  download a blank copy, sign on paper, and upload the scan.

## What's stubbed / up to you

- **Email notifications** (e.g. "your request was approved," and your Venmo
  handle for payment) — marked with `TODO` comments in `ClientDashboard.jsx`
  and `SitterDashboard.jsx`. Recommended approach: a Supabase Edge Function
  triggered on booking status change, calling an email API like Resend.
- **Chat with the sitter** — intentionally left for Phase 3.
- **Storage bucket privacy** — the `contracts` bucket setup below uses public
  URLs for simplicity. Before going live, switch it to a private bucket and
  generate signed URLs instead, since these PDFs contain personal info.

## Setup

1. **Create a Supabase project** at supabase.com (free tier is fine to start).
2. In the SQL Editor, run everything in `supabase/schema.sql`.
3. In Storage, create a bucket named `contracts`. For now, mark it public
   (see privacy note above for before-launch).
4. Copy `.env.example` to `.env.local` and fill in your project's URL and
   anon key (Project Settings → API).
5. `npm install`
6. `npm run dev`
7. Sign up once through the app (this creates a `client` account). In the
   Supabase Table Editor, open `profiles` and change your own row's `role`
   to `sitter` — this makes you the one sitter account. (Signup intentionally
   never lets you pick your own role from the form — otherwise anyone could
   make themselves the sitter.)

## Suggested next steps, in order

1. Wire up email notifications on status change (unlocks the Venmo-in-email
   idea cleanly).
2. Switch the `contracts` bucket to private + signed URLs.
3. Add a "my dogs" page so returning clients reuse a saved dog profile
   instead of re-entering it every request.
4. Phase 3: in-app chat, SMS notifications, recurring-client shortcuts.
