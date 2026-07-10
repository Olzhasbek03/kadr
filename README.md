# Kormem — the shared camera for any celebration

One night. A hundred eyes. One roll of film.

Kormem is a web-only shared camera for any occasion — weddings, birthdays,
corporate nights, reunions. The host creates an event and shares a QR code;
guests open a link and get a limited number of shots on an in-browser
camera: **photos, 10-second video clips and voice wishes**. Nothing is
visible until the reveal — then the whole night opens in one shared gallery.

**Free for everyone.** No payments anywhere in the product.

**Web only.** No native apps. The guest camera runs entirely in the mobile
browser (`getUserMedia` + `MediaRecorder`), with a native-camera fallback
for devices that block it, and installs as a PWA from the event page.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Supabase** — auth (magic link + Google), Postgres, private media storage
- **Tailwind CSS 4**
- **next-intl** — Russian (default), Kazakh, English
- Deploys to **Vercel**

## Feature map

| Area | What's implemented |
| --- | --- |
| Host | Magic-link / Google sign-in, event list, create form (shots, guest cap, reveal mode, film style), QR download + printable table card, guest list with per-type counts, moderation delete on any capture, live countdown, reveal-now, pre-reveal gallery, ZIP archive |
| Guest | No-account join (httpOnly session cookie), three capture modes — photo / 10s video / 60s voice wish — with seven film styles previewed live, per-type allowances, IndexedDB-backed upload queue that survives tab death and bad wifi, out-of-film screen, reveal animation, mixed-media gallery |
| Media | Photos compressed client-side (≤2000px JPEG q0.8); video mp4-first (H.264+AAC) with webm fallback, 720p @ 2.5 Mbps, client-captured poster frame; voice AAC/Opus @ 48 kbps with listen-back before sending |
| Integrity | Shot budget **and per-type sub-caps consumed atomically in Postgres** before upload; server-side magic-byte MIME sniffing and per-type size caps; per-session rate limit; reveal gating enforced **server-side**; originals stored clean — filters are display-time CSS only |
| PWA | Per-event manifest (`/e/[slug]/manifest.webmanifest`) whose icon opens straight into that event's camera; service worker scoped to `/e/` |

## Cost model (Supabase free tier)

Caps exist for cost control (1 GB storage / 5 GB egress), not monetization:
shared shot budget per guest (default 10), **max 3 video clips** (~3.3 MB
each) and **max 1 voice wish** (~0.4 MB) inside that budget, guest cap per
event (default 30). Galleries load thumbnails/posters first; full media
streams only on tap.

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

   …or paste `supabase/migrations/20260705100000_init.sql` into the
   SQL editor and run it. It creates the tables (`events`, `guests`,
   `media`), indexes, RLS policies, the atomic `consume_shot` /
   `refund_shot` functions and the private `media` storage bucket.

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

Open http://localhost:3000. Sign in at `/login` and create an event — it is
live immediately.

Guest flow: open the event's guest link (shown on the event page) on your
phone — same Wi-Fi + `NEXT_PUBLIC_APP_URL` set to your machine's LAN IP, or
just use the QR code from the dashboard.

## Testing

With the dev server running against a local Supabase (`supabase start`), the
integration suite drives the real HTTP routes end to end:

```bash
npm run test:e2e
```

It verifies RLS isolation (both directions, including moderation deletes),
guest join idempotency, the shooting-window grace, server-side magic-byte
validation, **atomic shot-budget + sub-cap enforcement under concurrent
uploads**, the per-session rate limit, the server-side reveal gate, and
typed signed-URL delivery for photos, clips and voice wishes.

The capture pipeline itself (camera/mic permissions, MediaRecorder formats)
must be smoke-tested on **real iOS Safari and real Android Chrome** — the
two differ meaningfully. Checklist: grant/deny camera, grant/deny mic,
record a clip on each (Safari produces mp4, Chrome mp4 or webm), record and
re-record a voice wish, kill the tab mid-upload and reopen (queue resumes),
Add to Home Screen and launch straight into the camera.

## Security model

- **Hosts** query through the cookie-bound Supabase client; RLS restricts
  every table to `host_user_id = auth.uid()` (read everywhere, plus delete
  on `media` for moderation).
- **Guests** never touch the database directly. The join / upload / gallery
  API routes run on the service-role key and enforce, in server code:
  session-cookie identity, guest capacity, the shooting window, magic-byte
  MIME sniffing with per-type size caps, a per-minute rate limit, the atomic
  shot counter with video/audio sub-caps, and the reveal gate.
- The `media` bucket is **private**; everything is served through
  short-lived signed URLs minted server-side after the access check
  (download URLs carry `content-disposition`).
- Originals are immutable: film styles are stored as a column and applied
  as CSS at display time, so downloads always return the clean file.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add the variables from `.env.example`; set `NEXT_PUBLIC_APP_URL` to the
   production URL (falls back to `https://kormem.vercel.app` if unset).
3. Add `https://YOUR-DOMAIN/auth/callback` to Supabase's redirect list.
4. Deploy. All routes are dynamic/server-rendered; nothing else to configure.

## Project layout

```
supabase/migrations/        schema + RLS + storage (single init migration)
public/sw.js                guest-scope service worker; icons/ for PWA
src/middleware.ts           session refresh + /dashboard guard
src/lib/
  config.ts                 app URL resolution, default guest cap
  filters.ts                seven film styles (CSS, display-time only)
  media.ts                  server acceptance rules + magic-byte sniffing
  supabase/                 browser / server (RLS) / admin (service) clients
  events.ts  types.ts       queries, reveal math, allowances, slug generator
  client/
    capture.ts              photo compression + poster frames
    recorder.ts             MediaRecorder wrapper (mp4-first, bitrate-capped)
    uploadQueue.ts          IndexedDB-persisted upload queue with retry
src/app/
  page.tsx                  landing (blue-hour design system)
  privacy/                  plain-language privacy note (RU/KZ/EN)
  login/  auth/             magic link + Google OAuth
  dashboard/                list · new · [eventId] (share, reveal, moderate, zip) · guests · print
  e/[slug]/                 guest landing · camera (3 modes) · gallery · manifest
  api/                      events · join · upload · gallery
src/messages/               ru (default) · kk · en — full parity
```
