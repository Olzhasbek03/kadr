import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { MEDIA_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";
import { getEventBySlug } from "@/lib/events";
import { DEVICE_COOKIE } from "@/lib/device";
import { isFilmStyle } from "@/lib/filters";
import {
  extensionFor,
  isMediaType,
  MEDIA_RULES,
  sniffMime,
  THUMB_MAX_BYTES,
  UPLOADS_PER_MINUTE,
} from "@/lib/media";
import {
  allowanceFor,
  AUDIO_CAP_PER_GUEST,
  AUDIO_MAX_SECONDS,
  effectiveStyles,
  isShootingOpen,
  VIDEO_CAP_PER_GUEST,
  VIDEO_MAX_SECONDS,
} from "@/lib/types";
import type { GuestRow, MediaType } from "@/lib/types";

/**
 * POST /api/e/[slug]/upload — accept one capture (photo, video or voice).
 *
 * Order of defenses, cheapest first:
 *   1. event exists + shooting window open
 *   2. guest session cookie → guest row
 *   3. per-minute rate limit (spam guard beyond the shot budget)
 *   4. file present, within the per-type size cap, magic bytes match
 *   5. shot budget + per-type sub-cap consumed ATOMICALLY in Postgres
 *      before the file is stored, so parallel uploads can never exceed
 *      either limit
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isShootingOpen(event)) {
    return NextResponse.json({ error: "shooting_closed" }, { status: 403 });
  }

  const deviceToken = req.cookies.get(DEVICE_COOKIE)?.value;
  if (!deviceToken) {
    return NextResponse.json({ error: "not_joined" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: guest } = await db
    .from("guests")
    .select("*")
    .eq("event_id", event.id)
    .eq("device_token", deviceToken)
    .maybeSingle<GuestRow>();
  if (!guest) return NextResponse.json({ error: "not_joined" }, { status: 401 });

  // Rate limit: the shot budget is the real cost gate, but this stops a
  // scripted client from burning it in one burst or probing after it's spent.
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await db
    .from("media")
    .select("id", { count: "exact", head: true })
    .eq("guest_id", guest.id)
    .gte("created_at", minuteAgo);
  if ((recentCount ?? 0) >= UPLOADS_PER_MINUTE) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const mediaTypeRaw = form.get("mediaType");
  const mediaType: MediaType = isMediaType(mediaTypeRaw) ? mediaTypeRaw : "photo";
  const rules = MEDIA_RULES[mediaType];

  const file = form.get("file");
  const thumb = form.get("thumb");
  const filterRaw = form.get("filter");
  const durationRaw = Number(form.get("duration"));
  // A style outside the host's allowed list is coerced to the event preset
  // rather than rejected: a stale client must never cost the guest a shot.
  const allowed = effectiveStyles(event);
  const filter =
    mediaType !== "audio" && isFilmStyle(filterRaw) && allowed.includes(filterRaw)
      ? filterRaw
      : mediaType === "audio"
        ? "original"
        : event.filter_preset;

  if (!(file instanceof File) || file.size === 0 || file.size > rules.maxBytes)
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  if (thumb !== null && (!(thumb instanceof File) || thumb.size > THUMB_MAX_BYTES))
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });

  // Never trust the declared Content-Type: sniff the container.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes, mediaType);
  if (!mime) return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  if (thumb instanceof File) {
    const thumbBytes = new Uint8Array(await thumb.slice(0, 4).arrayBuffer());
    if (!(thumbBytes[0] === 0xff && thumbBytes[1] === 0xd8 && thumbBytes[2] === 0xff))
      return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  // Duration is client-reported metadata (players need it because
  // MediaRecorder output often lacks a duration header); clamp to the caps
  // so it can't lie its way past the UI. The size cap is the real bound.
  const maxDuration =
    mediaType === "video" ? VIDEO_MAX_SECONDS + 1 : AUDIO_MAX_SECONDS + 2;
  const duration =
    mediaType === "photo" || !Number.isFinite(durationRaw)
      ? null
      : Math.min(Math.max(0, durationRaw), maxDuration);

  // Atomically consume one shot; refuses when the shared budget or the
  // per-type sub-cap is spent.
  const { data: consumed, error: rpcError } = await db.rpc("consume_shot", {
    p_guest_id: guest.id,
    p_media_type: mediaType,
    p_shot_limit: event.shots_per_guest,
    p_video_cap: VIDEO_CAP_PER_GUEST,
    p_audio_cap: AUDIO_CAP_PER_GUEST,
  });
  if (rpcError) {
    console.error("consume_shot:", rpcError.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  if (!consumed) {
    const allowance = allowanceFor(event, guest);
    const error =
      mediaType === "video" && allowance.videosLeft <= 0 && allowance.shotsLeft > 0
        ? "video_cap"
        : mediaType === "audio" && allowance.audiosLeft <= 0 && allowance.shotsLeft > 0
          ? "audio_cap"
          : "out_of_film";
    return NextResponse.json({ error, ...allowance }, { status: 403 });
  }

  const mediaId = randomUUID();
  const storagePath = `${event.id}/${guest.id}/${mediaId}.${extensionFor(mime)}`;
  const thumbPath =
    thumb instanceof File ? `${event.id}/${guest.id}/${mediaId}.thumb.jpg` : null;

  try {
    const storage = db.storage.from(MEDIA_BUCKET);
    const up1 = await storage.upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (up1.error) throw new Error(up1.error.message);
    if (thumb instanceof File && thumbPath) {
      const up2 = await storage.upload(thumbPath, thumb, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (up2.error) throw new Error(up2.error.message);
    }

    const { error: insertError } = await db.from("media").insert({
      id: mediaId,
      event_id: event.id,
      guest_id: guest.id,
      media_type: mediaType,
      storage_path: storagePath,
      thumb_path: thumbPath,
      mime_type: mime,
      size_bytes: file.size,
      duration_s: duration,
      filter,
    });
    if (insertError) throw new Error(insertError.message);
  } catch (err) {
    console.error("upload:", err);
    await db
      .rpc("refund_shot", { p_guest_id: guest.id, p_media_type: mediaType })
      .then(
        () => {},
        () => {}
      );
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const updatedGuest: GuestRow = {
    ...guest,
    shots_used: guest.shots_used + 1,
    video_count: guest.video_count + (mediaType === "video" ? 1 : 0),
    audio_count: guest.audio_count + (mediaType === "audio" ? 1 : 0),
  };
  return NextResponse.json({ ok: true, ...allowanceFor(event, updatedGuest) }, { status: 201 });
}
