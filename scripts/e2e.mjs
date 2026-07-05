// End-to-end integration test against the running dev server + local Supabase.
// Exercises the real HTTP API routes and data-integrity guarantees:
// RLS, the shooting window, per-type sub-caps, atomic shot budget,
// server-side MIME sniffing, rate limiting, the reveal gate and moderation.
const APP = "http://localhost:3000";
const SB = "http://127.0.0.1:54321";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  (c ? pass++ : fail++), console.log(`${c ? "✓" : "✗ FAIL"}  ${m}`);
};

// A 1x1 JPEG (magic bytes FF D8 FF).
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AvwA//9k=",
  "base64"
);
// EBML header → sniffed as webm.
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64, 1)]);
// ftyp box → sniffed as mp4/m4a.
const M4A = Buffer.concat([
  Buffer.from([0, 0, 0, 0x20]),
  Buffer.from("ftypM4A "),
  Buffer.alloc(64, 1),
]);
const TEXT = Buffer.from("definitely not media");

const svcHeaders = {
  apikey: process.env.SERVICE_KEY,
  Authorization: `Bearer ${process.env.SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function uploadForm(mediaType, bytes, mime, { thumb = null, duration = null, filter = "noir" } = {}) {
  const f = new FormData();
  f.append("mediaType", mediaType);
  f.append("file", new Blob([bytes], { type: mime }), "capture.bin");
  if (thumb) f.append("thumb", new Blob([thumb], { type: "image/jpeg" }), "t.jpg");
  f.append("filter", filter);
  if (duration !== null) f.append("duration", String(duration));
  return f;
}

const upload = (slug, cookie, mediaType, bytes, mime, opts) =>
  fetch(`${APP}/api/e/${slug}/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: uploadForm(mediaType, bytes, mime, opts),
  });

async function join(slug, name, cookie = "") {
  const res = await fetch(`${APP}/api/e/${slug}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(name ? { name } : {}),
  });
  const body = await res.json().catch(() => ({}));
  const setCookie = res.headers.get("set-cookie") || "";
  const device = /kadr_device=([^;]+)/.exec(setCookie)?.[1];
  return { res, body, cookie: device ? `kadr_device=${device}` : cookie };
}

async function main() {
  const token = process.env.HOST_JWT;
  const userId = process.env.HOST_UID;
  const now = Date.now();

  // ── 1. RLS: authed host insert (what /api/events does under the hood)
  const slug = "e2e" + Math.random().toString(36).slice(2, 7);
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
      name: "E2E Celebration",
      slug,
      event_date: new Date(now + 3600e3).toISOString(),
      end_time: new Date(now - 40 * 60e3).toISOString(), // beyond the 30-min grace
      shots_per_guest: 6,
      max_guests: 50,
      reveal_mode: "custom",
      reveal_at: new Date(now + 3600e3).toISOString(), // reveal in 1h → gated
      filter_preset: "original",
    }),
  });
  const insertJson = await insertRes.json();
  if (insertRes.status !== 201)
    console.log("  insert response:", insertRes.status, JSON.stringify(insertJson));
  const event = Array.isArray(insertJson) ? insertJson[0] : insertJson;
  ok(
    insertRes.status === 201 && event?.id && event.status === "active",
    "RLS: host inserts own event; it is active immediately (no payment gate)"
  );
  const eventId = event.id;

  // RLS negative: a different user must not read this event
  const otherRead = await fetch(`${SB}/rest/v1/events?slug=eq.${slug}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${process.env.OTHER_JWT}` },
  });
  const otherRows = await otherRead.json();
  ok(Array.isArray(otherRows) && otherRows.length === 0, "RLS: other host cannot read the event");

  // ── 2. Guest joins; allowance covers all three media types
  const g1 = await join(slug, "Asel");
  ok(
    g1.res.status === 200 &&
      g1.body.shotsLeft === 6 &&
      g1.body.videosLeft === 3 &&
      g1.body.audiosLeft === 1 &&
      g1.cookie,
    "Guest: joins, gets shot budget + video/audio sub-caps + session cookie"
  );

  const rejoin = await join(slug, null, g1.cookie);
  ok(rejoin.body.shotsLeft === 6, "Guest: rejoin is idempotent (same session resumes)");

  // localStorage mirror: no cookie, token in the body re-adopts the session
  const rawToken = decodeURIComponent(g1.cookie.split("=")[1]);
  const adopt = await fetch(`${APP}/api/e/${slug}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceToken: rawToken }),
  });
  const adoptBody = await adopt.json();
  ok(
    adopt.status === 200 && adoptBody.guest.id === g1.body.guest.id,
    "Guest: stored device token re-adopts the same session without a cookie"
  );

  // ── 3. Shooting window closed → upload refused
  const upClosed = await upload(slug, g1.cookie, "photo", JPEG, "image/jpeg");
  ok(upClosed.status === 403, "Upload: refused after shooting window closes");

  // reopen the window
  await fetch(`${SB}/rest/v1/events?id=eq.${eventId}`, {
    method: "PATCH",
    headers: svcHeaders,
    body: JSON.stringify({ end_time: new Date(now + 3600e3).toISOString() }),
  });

  // ── 4. Server-side validation: text bytes are not a photo
  const upBad = await upload(slug, g1.cookie, "photo", TEXT, "image/jpeg");
  ok(upBad.status === 400, "Upload: magic-byte sniffing rejects a fake 'photo'");
  const upBadVideo = await upload(slug, g1.cookie, "video", JPEG, "video/mp4");
  ok(upBadVideo.status === 400, "Upload: JPEG bytes rejected as a 'video'");

  // ── 5. One photo, three videos, one voice wish — then the sub-caps bite
  const upPhoto = await upload(slug, g1.cookie, "photo", JPEG, "image/jpeg", { thumb: JPEG });
  const photoBody = await upPhoto.json();
  ok(
    upPhoto.status === 201 && photoBody.shotsLeft === 5,
    "Upload: photo accepted, shared budget decrements"
  );

  let videoStatuses = [];
  for (let i = 0; i < 3; i++) {
    const r = await upload(slug, g1.cookie, "video", WEBM, "video/webm", {
      thumb: JPEG,
      duration: 8.5,
    });
    videoStatuses.push(r.status);
  }
  ok(videoStatuses.every((s) => s === 201), "Upload: three video clips accepted (webm sniffed)");

  const upVideo4 = await upload(slug, g1.cookie, "video", WEBM, "video/webm");
  const video4Body = await upVideo4.json();
  ok(
    upVideo4.status === 403 && video4Body.error === "video_cap",
    "Sub-cap: 4th video refused with video_cap while shots remain"
  );

  const upAudio = await upload(slug, g1.cookie, "audio", M4A, "audio/mp4", { duration: 22 });
  ok(upAudio.status === 201, "Upload: voice wish accepted (m4a sniffed)");
  const upAudio2 = await upload(slug, g1.cookie, "audio", M4A, "audio/mp4");
  const audio2Body = await upAudio2.json();
  ok(
    upAudio2.status === 403 && audio2Body.error === "audio_cap",
    "Sub-cap: 2nd voice wish refused with audio_cap"
  );

  // ── 6. One shot left (6 - 1 photo - 3 videos - 1 audio): parallel race
  const race = await Promise.all([
    upload(slug, g1.cookie, "photo", JPEG, "image/jpeg").then((r) => r.status),
    upload(slug, g1.cookie, "photo", JPEG, "image/jpeg").then((r) => r.status),
    upload(slug, g1.cookie, "photo", JPEG, "image/jpeg").then((r) => r.status),
  ]);
  const created = race.filter((s) => s === 201).length;
  const refused = race.filter((s) => s === 403).length;
  ok(
    created === 1 && refused === 2,
    `Upload: atomic budget holds under concurrency (1 created, 2 refused; got ${created}/${refused})`
  );

  // ── 7. Reveal gate: every read path fails closed pre-reveal
  const galLocked = await fetch(`${APP}/api/e/${slug}/gallery`);
  ok(galLocked.status === 403, "Reveal gate: gallery returns 403 before reveal time");

  const zipLocked = await fetch(`${APP}/api/e/${slug}/download`);
  ok(zipLocked.status === 403, "Reveal gate: zip download refused pre-reveal (no auth)");

  // Raw clients get nothing from the database directly.
  const anonRead = await fetch(`${SB}/rest/v1/media?event_id=eq.${eventId}&select=id`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  const anonRows = await anonRead.json().catch(() => null);
  ok(
    !anonRead.ok || (Array.isArray(anonRows) && anonRows.length === 0),
    "RLS: anonymous client reads zero media rows pre-reveal"
  );
  const otherMediaRead = await fetch(`${SB}/rest/v1/media?event_id=eq.${eventId}&select=id`, {
    headers: { apikey: ANON, Authorization: `Bearer ${process.env.OTHER_JWT}` },
  });
  const otherMediaRows = await otherMediaRead.json().catch(() => null);
  ok(
    Array.isArray(otherMediaRows) && otherMediaRows.length === 0,
    "RLS: another authed user reads zero media rows pre-reveal"
  );
  const hostMediaRead = await fetch(`${SB}/rest/v1/media?event_id=eq.${eventId}&select=id`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  });
  const hostMediaRows = await hostMediaRead.json().catch(() => null);
  ok(
    Array.isArray(hostMediaRows) && hostMediaRows.length > 0,
    "RLS: the host (and only the host) reads media pre-reveal for moderation"
  );

  await fetch(`${SB}/rest/v1/events?id=eq.${eventId}`, {
    method: "PATCH",
    headers: svcHeaders,
    body: JSON.stringify({ reveal_at: new Date(now - 1000).toISOString() }),
  });
  const galOpen = await fetch(`${APP}/api/e/${slug}/gallery`, {
    headers: { Cookie: g1.cookie },
  });
  const galBody = await galOpen.json();
  const media = galBody.media || [];
  const byType = (t) => media.filter((m) => m.type === t);
  ok(
    galOpen.status === 200 &&
      byType("photo").length === 2 &&
      byType("video").length === 3 &&
      byType("audio").length === 1,
    `Gallery: typed media served (got ${byType("photo").length} photo / ${byType("video").length} video / ${byType("audio").length} audio)`
  );
  ok(
    media.every((m) => m.url && m.downloadUrl) &&
      byType("video").every((m) => m.durationS > 0),
    "Gallery: signed display + download URLs on every item, durations on clips"
  );
  ok(media.every((m) => m.mine === true), "Gallery: guest's own media flagged 'mine'");

  // Post-reveal the zip streams for anyone with the link.
  const zipRes = await fetch(`${APP}/api/e/${slug}/download`);
  const zipHead = Buffer.from(await zipRes.arrayBuffer()).subarray(0, 4);
  ok(
    zipRes.status === 200 &&
      (zipRes.headers.get("content-type") || "").includes("application/zip") &&
      zipHead[0] === 0x50 &&
      zipHead[1] === 0x4b,
    "Download: streamed zip served post-reveal (PK signature)"
  );

  // ── 8. Moderation: host deletes one item via RLS; stranger cannot
  const victim = byType("photo")[0];
  const strangerDel = await fetch(`${SB}/rest/v1/media?id=eq.${victim.id}`, {
    method: "DELETE",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${process.env.OTHER_JWT}`,
      Prefer: "return=representation",
    },
  });
  const strangerRows = await strangerDel.json().catch(() => []);
  ok(
    Array.isArray(strangerRows) && strangerRows.length === 0,
    "RLS: other user's delete touches nothing"
  );
  const hostDel = await fetch(`${SB}/rest/v1/media?id=eq.${victim.id}`, {
    method: "DELETE",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
    },
  });
  const hostRows = await hostDel.json().catch(() => []);
  ok(
    Array.isArray(hostRows) && hostRows.length === 1,
    "RLS: host deletes a capture from their own event"
  );

  // ── 9. Allowed styles: a disallowed filter is coerced to the preset
  await fetch(`${SB}/rest/v1/events?id=eq.${eventId}`, {
    method: "PATCH",
    headers: svcHeaders,
    body: JSON.stringify({ shots_per_guest: 50, allowed_styles: ["noir", "original"], filter_preset: "original" }),
  });
  const g2 = await join(slug, "Spammer");
  const styled = await upload(slug, g2.cookie, "photo", JPEG, "image/jpeg", {
    filter: "polaroid", // not in the allowed list; event preset is original
  });
  const styledRow = await fetch(
    `${SB}/rest/v1/media?guest_id=eq.${g2.body.guest.id}&select=filter&order=created_at.desc&limit=1`,
    { headers: { apikey: ANON, Authorization: `Bearer ${token}` } }
  ).then((r) => r.json());
  ok(
    styled.status === 201 && styledRow?.[0]?.filter === "original",
    "Allowed styles: disallowed filter stored as the event preset, shot not lost"
  );

  // ── 10. Rate limit: a fresh guest hammering the endpoint hits 429
  let sawTooMany = false;
  for (let i = 0; i < 10; i++) {
    const r = await upload(slug, g2.cookie, "photo", JPEG, "image/jpeg");
    if (r.status === 429) {
      sawTooMany = true;
      break;
    }
  }
  ok(sawTooMany, "Rate limit: burst uploads from one session hit 429");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
