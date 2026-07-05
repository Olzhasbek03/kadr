import { NextRequest, NextResponse } from "next/server";
import { MEDIA_BUCKET, SIGNED_URL_TTL, supabaseAdmin } from "@/lib/supabase/admin";
import { getEventBySlug } from "@/lib/events";
import { DEVICE_COOKIE } from "@/lib/device";
import { isRevealed } from "@/lib/types";
import type { MediaType } from "@/lib/types";

interface MediaRecord {
  id: string;
  media_type: MediaType;
  storage_path: string;
  thumb_path: string | null;
  mime_type: string;
  duration_s: number | null;
  filter: string;
  created_at: string;
  guest_id: string;
  guests: { display_name: string | null; device_token: string } | null;
}

/** The shape each gallery item is served as (guest + host galleries). */
export interface GalleryItem {
  id: string;
  type: MediaType;
  url: string | null;
  /** photo thumbnail or video poster; null for audio */
  thumbUrl: string | null;
  mimeType: string;
  durationS: number | null;
  filter: string;
  guestName: string | null;
  mine: boolean;
  createdAt: string;
}

/**
 * GET /api/e/[slug]/gallery — the shared gallery.
 * HARD reveal gate: before reveal_at this endpoint returns 403 for everyone.
 * (The host sees pre-reveal media in the dashboard, which runs under their
 * authenticated session — never through this public route.)
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!isRevealed(event.reveal_at)) {
    return NextResponse.json(
      { error: "not_revealed", revealAt: event.reveal_at },
      { status: 403 }
    );
  }

  const db = supabaseAdmin();
  const { data: rows, error } = await db
    .from("media")
    .select(
      "id, media_type, storage_path, thumb_path, mime_type, duration_s, filter, created_at, guest_id, guests(display_name, device_token)"
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: true })
    .returns<MediaRecord[]>();
  if (error) {
    console.error("gallery:", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const storage = db.storage.from(MEDIA_BUCKET);
  const paths = rows.flatMap((m) =>
    m.thumb_path ? [m.storage_path, m.thumb_path] : [m.storage_path]
  );
  const { data: signed } =
    paths.length > 0
      ? await storage.createSignedUrls(paths, SIGNED_URL_TTL)
      : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const deviceToken = req.cookies.get(DEVICE_COOKIE)?.value;

  const items: GalleryItem[] = rows.map((m) => ({
    id: m.id,
    type: m.media_type,
    url: urlFor.get(m.storage_path) ?? null,
    thumbUrl: m.thumb_path ? (urlFor.get(m.thumb_path) ?? null) : null,
    mimeType: m.mime_type,
    durationS: m.duration_s === null ? null : Number(m.duration_s),
    filter: m.filter,
    guestName: m.guests?.display_name ?? null,
    mine: !!deviceToken && m.guests?.device_token === deviceToken,
    createdAt: m.created_at,
  }));

  return NextResponse.json({
    event: { name: event.name, revealAt: event.reveal_at, filterPreset: event.filter_preset },
    media: items,
  });
}
