import { NextRequest, NextResponse } from "next/server";
import { PHOTOS_BUCKET, SIGNED_URL_TTL, supabaseAdmin } from "@/lib/supabase/admin";
import { getEventBySlug } from "@/lib/events";
import { DEVICE_COOKIE } from "@/lib/device";
import { isRevealed } from "@/lib/types";

interface PhotoRecord {
  id: string;
  original_path: string;
  thumb_path: string | null;
  filter: string;
  created_at: string;
  guest_id: string;
  guests: { display_name: string | null; device_token: string } | null;
}

/**
 * GET /api/e/[slug]/gallery — the shared gallery.
 * HARD reveal gate: before reveal_at this endpoint returns 403 for everyone.
 * (The host sees pre-reveal photos in the dashboard, which runs under their
 * authenticated session — never through this public route.)
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== "active") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!isRevealed(event.reveal_at)) {
    return NextResponse.json(
      { error: "not_revealed", revealAt: event.reveal_at },
      { status: 403 }
    );
  }

  const db = supabaseAdmin();
  const { data: photos, error } = await db
    .from("photos")
    .select(
      "id, original_path, thumb_path, filter, created_at, guest_id, guests(display_name, device_token)"
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: true })
    .returns<PhotoRecord[]>();
  if (error) {
    console.error("gallery:", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const storage = db.storage.from(PHOTOS_BUCKET);
  const paths = photos.flatMap((p) => [p.original_path, p.thumb_path ?? p.original_path]);
  const { data: signed } = await storage.createSignedUrls(paths, SIGNED_URL_TTL);
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const deviceToken = req.cookies.get(DEVICE_COOKIE)?.value;

  return NextResponse.json({
    event: { name: event.name, revealAt: event.reveal_at, filterPreset: event.filter_preset },
    photos: photos.map((p) => ({
      id: p.id,
      url: urlFor.get(p.original_path) ?? null,
      thumbUrl: urlFor.get(p.thumb_path ?? p.original_path) ?? null,
      filter: p.filter,
      guestName: p.guests?.display_name ?? null,
      mine: !!deviceToken && p.guests?.device_token === deviceToken,
      createdAt: p.created_at,
    })),
  });
}
