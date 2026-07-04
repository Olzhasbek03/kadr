// End-to-end integration test against the running dev server + local Supabase.
// Exercises the real HTTP API routes and data-integrity guarantees.
const APP = "http://localhost:3000";
const SB = "http://127.0.0.1:54321";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  (c ? pass++ : fail++), console.log(`${c ? "✓" : "✗ FAIL"}  ${m}`);
};

// A 1x1 JPEG.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AvwA//9k=",
  "base64"
);

async function main() {
  // ── host JWT via password grant (user was confirmed in the UI login test)
  await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "host@kadr.test", password: "x" }),
  }); // may fail; we set password next via admin in the shell wrapper
  const token = process.env.HOST_JWT;
  const userId = process.env.HOST_UID;

  // ── 1. RLS: authed host insert (what /api/events does under the hood)
  const slug = "e2e" + Math.random().toString(36).slice(2, 7);
  const now = Date.now();
  const insertRes = await fetch(`${SB}/rest/v1/events`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      host_user_id: userId,
      name: "E2E Wedding",
      slug,
      event_date: new Date(now + 3600e3).toISOString(),
      end_time: new Date(now - 40 * 60e3).toISOString(), // 40 min ago → beyond the 30-min grace
      shots_per_guest: 2,
      max_guests: 50,
      reveal_mode: "custom",
      reveal_at: new Date(now + 3600e3).toISOString(), // reveal in 1h → gated
      filter_preset: "warm",
      status: "draft",
      price: 9900,
    }),
  });
  const insertJson = await insertRes.json();
  if (insertRes.status !== 201) console.log("  insert response:", insertRes.status, JSON.stringify(insertJson));
  const event = Array.isArray(insertJson) ? insertJson[0] : insertJson;
  ok(insertRes.status === 201 && event?.id, "RLS: host can insert own event");

  // RLS negative: a different user must not read this event
  const otherToken = process.env.OTHER_JWT;
  const otherRead = await fetch(`${SB}/rest/v1/events?slug=eq.${slug}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${otherToken}` },
  });
  const otherRows = await otherRead.json();
  ok(Array.isArray(otherRows) && otherRows.length === 0, "RLS: other host cannot read the event");

  const eventId = event.id;

  // ── 2. Guest cannot join a draft event
  const joinDraft = await fetch(`${APP}/api/e/${slug}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Asay" }),
  });
  ok(joinDraft.status === 404, "Guest: cannot join a draft (unpaid) event");

  // ── 3. Payment webhook activates the event
  // create a pending payment row (as /api/payments/invoice would)
  const extId = "e2e-inv-" + Math.random().toString(36).slice(2, 8);
  await fetch(`${SB}/rest/v1/payments`, {
    method: "POST",
    headers: {
      apikey: process.env.SERVICE_KEY,
      Authorization: `Bearer ${process.env.SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_id: eventId,
      provider: "mock",
      external_id: extId,
      amount: 9900,
      status: "pending",
    }),
  });
  // bad signature rejected
  const badHook = await fetch(`${APP}/api/payments/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ externalId: extId, status: "paid", signature: "deadbeef" }),
  });
  ok(badHook.status === 401, "Payments: webhook rejects a bad signature");
  // sandbox complete → signed webhook → activation
  const complete = await fetch(`${APP}/api/payments/mock/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ externalId: extId, outcome: "paid" }),
  });
  ok(complete.status === 200, "Payments: sandbox complete fires signed webhook");

  // ── 4. Guest join (now active). Capture device cookie.
  const join = await fetch(`${APP}/api/e/${slug}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Asay" }),
  });
  const joinBody = await join.json();
  const setCookie = join.headers.get("set-cookie") || "";
  const device = /kadr_device=([^;]+)/.exec(setCookie)?.[1];
  ok(join.status === 200 && joinBody.shotsLeft === 2 && device, "Guest: joins active event, gets 2 shots + device cookie");
  const cookie = `kadr_device=${device}`;

  // idempotent rejoin
  const rejoin = await fetch(`${APP}/api/e/${slug}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({}),
  });
  const rejoinBody = await rejoin.json();
  ok(rejoinBody.shotsLeft === 2, "Guest: rejoin is idempotent (still 2 shots, no new guest)");

  // ── 5. Shooting is closed (end_time in the past) → upload refused
  const upClosed = await fetch(`${APP}/api/e/${slug}/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: (() => {
      const f = new FormData();
      f.append("original", new Blob([JPEG], { type: "image/jpeg" }), "s.jpg");
      f.append("filter", "warm");
      return f;
    })(),
  });
  ok(upClosed.status === 403, "Upload: refused after shooting window closes");

  // reopen the window (extend end_time) to test shot-limit atomicity
  await fetch(`${SB}/rest/v1/events?id=eq.${eventId}`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SERVICE_KEY,
      Authorization: `Bearer ${process.env.SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ end_time: new Date(now + 3600e3).toISOString() }),
  });

  // ── 6. Fire 5 uploads in parallel against a 2-shot limit
  const shot = () =>
    fetch(`${APP}/api/e/${slug}/upload`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: (() => {
        const f = new FormData();
        f.append("original", new Blob([JPEG], { type: "image/jpeg" }), "s.jpg");
        f.append("thumb", new Blob([JPEG], { type: "image/jpeg" }), "t.jpg");
        f.append("filter", "noir");
        return f;
      })(),
    }).then((r) => r.status);
  const results = await Promise.all([shot(), shot(), shot(), shot(), shot()]);
  const created = results.filter((s) => s === 201).length;
  const refused = results.filter((s) => s === 403).length;
  ok(created === 2 && refused === 3, `Upload: atomic shot limit holds under concurrency (2 created, 3 refused; got ${created}/${refused})`);

  // ── 7. Reveal gate: gallery is 403 before reveal_at
  const galLocked = await fetch(`${APP}/api/e/${slug}/gallery`);
  ok(galLocked.status === 403, "Reveal gate: gallery returns 403 before reveal time");

  // move reveal into the past
  await fetch(`${SB}/rest/v1/events?id=eq.${eventId}`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SERVICE_KEY,
      Authorization: `Bearer ${process.env.SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reveal_at: new Date(now - 1000).toISOString() }),
  });
  const galOpen = await fetch(`${APP}/api/e/${slug}/gallery`, { headers: { Cookie: cookie } });
  const galBody = await galOpen.json();
  const photos = galBody.photos || [];
  ok(
    galOpen.status === 200 && photos.length === 2 && photos.every((p) => p.url && p.thumbUrl),
    `Reveal: after reveal, gallery returns 2 photos with signed URLs`
  );
  ok(photos.length > 0 && photos.every((p) => p.mine === true), "Gallery: guest's own photos flagged 'mine'");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
