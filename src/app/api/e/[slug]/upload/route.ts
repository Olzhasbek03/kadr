import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PHOTOS_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";
import { getEventBySlug } from "@/lib/events";
import { DEVICE_COOKIE } from "@/lib/device";
import { isFilmStyle } from "@/lib/filters";
import { isShootingOpen } from "@/lib/types";
import type { GuestRow } from "@/lib/types";

const MAX_ORIGINAL_BYTES = 18 * 1024 * 1024;
const MAX_THUMB_BYTES = 2 * 1024 * 1024;

/**
 * POST /api/e/[slug]/upload — accept one shot. The shot limit is consumed
 * atomically in Postgres BEFORE the file is stored, so parallel uploads
 * can never exceed the guest's film.
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  const original = form.get("original");
  const thumb = form.get("thumb");
  const filterRaw = form.get("filter");
  const filter = isFilmStyle(filterRaw) ? filterRaw : event.filter_preset;

  if (!(original instanceof File) || original.size === 0 || original.size > MAX_ORIGINAL_BYTES)
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  if (thumb !== null && (!(thumb instanceof File) || thumb.size > MAX_THUMB_BYTES))
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });

  // Atomically consume one shot; refuses when the film is empty.
  const { data: consumed, error: rpcError } = await db.rpc("consume_shot", {
    p_guest_id: guest.id,
    p_limit: event.shots_per_guest,
  });
  if (rpcError) {
    console.error("consume_shot:", rpcError.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  if (!consumed) {
    return NextResponse.json({ error: "out_of_film", shotsLeft: 0 }, { status: 403 });
  }

  const photoId = randomUUID();
  const originalPath = `events/${event.id}/${photoId}.jpg`;
  const thumbPath = thumb ? `events/${event.id}/${photoId}.thumb.jpg` : null;

  try {
    const storage = db.storage.from(PHOTOS_BUCKET);
    const up1 = await storage.upload(originalPath, original, {
      contentType: "image/jpeg",
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

    const { error: insertError } = await db.from("photos").insert({
      id: photoId,
      event_id: event.id,
      guest_id: guest.id,
      original_path: originalPath,
      thumb_path: thumbPath,
      filter,
    });
    if (insertError) throw new Error(insertError.message);
  } catch (err) {
    console.error("upload:", err);
    await db.rpc("refund_shot", { p_guest_id: guest.id }).then(
      () => {},
      () => {}
    );
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const shotsLeft = Math.max(0, event.shots_per_guest - (guest.shots_used + 1));
  return NextResponse.json({ ok: true, shotsLeft }, { status: 201 });
}
