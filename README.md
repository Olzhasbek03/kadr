# Korme — the shared disposable camera

One night. A hundred eyes. One roll of film.

Korme is a web-only shared disposable camera for weddings and celebrations.
The host creates an event and shares a QR code; guests open a link, get a
limited number of shots on an in-browser film camera, and nothing is visible
until the reveal — then the whole night opens in one shared gallery.

**Web only.** No native apps. The guest camera runs entirely in the mobile
browser (`getUserMedia` + canvas), with a native-camera fallback for devices
that block it.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Supabase** — auth (magic link + Google), Postgres, private photo storage
- **Tailwind CSS 4**
- **next-intl** — Russian (default), Kazakh, English
- Deploys to **Vercel**

## Feature map

| Area | What's implemented |
| --- | --- |
| Host | Magic-link / Google sign-in, event list, single-page create form (shots, guest cap, reveal mode, film style), QR download + printable table card, live countdown, reveal-now, pre-reveal gallery, ZIP archive of originals |
| Guest | No-account join (httpOnly device cookie), live camera with 6 film styles applied to the viewfinder in real time, tactile shutter, shot counter, front/back flip, out-of-film screen, locked "developing" countdown, reveal animation, gallery with downloads |
| Integrity | Shot limits consumed **atomically in Postgres** before upload; reveal gating enforced **server-side** (the public gallery API refuses early requests); originals stored clean — filters are display-time CSS only |
| Payments | `PaymentProvider` interface; **mock sandbox provider** that runs the full invoice → checkout → signed webhook → activation cycle; **Kaspi facilitator stub** ready for credentials; free tier below a configurable guest count |

## Getting started

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Put the URL / anon key / service-role key into `.env.local`.
3. Apply the schema — either:

   ```bash
   # with the Supabase CLI
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   …or paste `supabase/migrations/20260705000001_init.sql` into the
   SQL editor and run it. It creates the tables, indexes, RLS policies,
   the atomic `consume_shot` / `refund_shot` functions and the private
   `photos` storage bucket.

4. **Auth setup** (Dashboard → Authentication):
   - Providers → Email: keep "magic link" enabled.
   - Providers → Google: add your OAuth client id/secret (optional but
     supported out of the box).
   - URL Configuration → add `http://localhost:3000/auth/callback` and your
     production `https://YOUR-DOMAIN/auth/callback` to the redirect list.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000. Sign in at `/login`, create an event, and pay
through the built-in sandbox (`PAYMENTS_PROVIDER=mock`) — the fake checkout
fires a **real signed webhook** at `/api/payments/webhook`, so the whole
activation path is exercised exactly as in production.

Guest flow: open the event's guest link (shown on the event page) on your
phone — same Wi-Fi + `NEXT_PUBLIC_APP_URL` set to your machine's LAN IP, or
just use the QR code from the dashboard.

## Testing

With the dev server running against a local Supabase (`supabase start`), the
integration suite drives the real HTTP routes end to end:

```bash
npm run test:e2e
```

It verifies RLS isolation (both directions), the draft→paid gate, the full
signed-webhook payment cycle, guest join idempotency, the shooting-window
grace, **atomic shot-limit enforcement under concurrent uploads**, the
server-side reveal gate, and signed-URL delivery. 12 assertions, all green.

## Payments

All gateways sit behind one interface (`src/lib/payments/types.ts`):

```ts
interface PaymentProvider {
  id: string;
  createInvoice(input): Promise<{ externalId, paymentUrl }>;
  verifyWebhook(rawBody, headers): Promise<{ externalId, status } | null>;
}
```

- `mock` — default. Sandbox checkout at `/pay/mock/[invoiceId]` plays the
  facilitator role and delivers an HMAC-signed callback to the webhook.
- `kaspi` — a facilitator-pattern REST stub (`src/lib/payments/kaspi.ts`).
  Kaspi has no public self-serve API; when you sign with an aggregator, fill
  `KASPI_API_URL`, `KASPI_API_TOKEN`, `KASPI_MERCHANT_ID`,
  `KASPI_WEBHOOK_SECRET`, set `PAYMENTS_PROVIDER=kaspi`, and adjust the two
  field names to your facilitator's docs if they differ.
- Adding Freedom Pay / Halyk ePay later = one new file + one registry line
  in `src/lib/payments/index.ts`.

Pricing is config, not code: `EVENT_PRICE_KZT` and `FREE_GUEST_LIMIT`.

## Security model

- **Hosts** query through the cookie-bound Supabase client; RLS restricts
  every table to `host_user_id = auth.uid()`.
- **Guests** never touch the database directly. The join / upload / gallery
  API routes run on the service-role key and enforce, in server code:
  device-cookie identity, guest capacity, the shooting window, the atomic
  shot counter, and the reveal gate.
- The `photos` bucket is **private**; every image is served through
  short-lived signed URLs minted server-side after the access check.
- Originals are immutable: film styles are stored as a column and applied
  as CSS at display time, so downloads always return the clean file.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add all variables from `.env.example` (set `NEXT_PUBLIC_APP_URL` to the
   production URL, and a strong `PAYMENTS_WEBHOOK_SECRET`).
3. Add `https://YOUR-DOMAIN/auth/callback` to Supabase's redirect list.
4. Deploy. All routes are dynamic/server-rendered; nothing else to configure.

## Project layout

```
supabase/migrations/        schema + RLS + storage (single init migration)
src/middleware.ts           session refresh + /dashboard guard
src/lib/
  config.ts                 prices, free tier, app URL
  filters.ts                the six film styles (CSS, display-time only)
  payments/                 provider interface, mock, kaspi stub, registry
  supabase/                 browser / server (RLS) / admin (service) clients
  events.ts  types.ts       queries, reveal math, slug generator
  client/capture.ts         full-res frame grab + thumbnail
src/app/
  page.tsx                  marketing landing
  login/  auth/             magic link + Google OAuth
  dashboard/                list · new · [eventId] (share, pay, reveal, zip) · print
  e/[slug]/                 guest landing · camera · gallery
  pay/mock/[invoiceId]/     sandbox checkout
  api/                      events · join · upload · gallery · invoice · webhook
src/messages/               ru (default) · kk · en
```
