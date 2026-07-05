import { NextRequest, NextResponse } from "next/server";
import { MEDIA_BUCKET, SIGNED_URL_TTL, supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { getEventBySlug } from "@/lib/events";
import { extensionFor } from "@/lib/media";
import { isRevealed } from "@/lib/types";
import { zipStream, type ZipEntry } from "@/lib/zipStream";

export const dynamic = "force-dynamic";
// Large archives take a while; stream for as long as the platform allows.
export const maxDuration = 300;

interface MediaRecord {
  id: string;
  media_type: "photo" | "video" | "audio";
  storage_path: string;
  mime_type: string;
  created_at: string;
}

/**
 * GET /api/e/[slug]/download — the whole gallery as one ZIP, streamed.
 *
 * Access: anyone with the link once the event is revealed; the event's
 * host at any time (their dashboard shows the gallery pre-reveal). Files
 * are fetched from private storage one at a time and piped straight into
 * a STORE-method zip, so memory stays flat however large the event is.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!isRevealed(event.reveal_at)) {
    // Pre-reveal the archive is host-only.
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== event.host_user_id) {
      return NextResponse.json({ error: "not_revealed" }, { status: 403 });
    }
  }

  const db = supabaseAdmin();
  const { data: rows, error } = await db
    .from("media")
    .select("id, media_type, storage_path, mime_type, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: true })
    .returns<MediaRecord[]>();
  if (error) {
    console.error("download:", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "empty" }, { status: 404 });
  }

  const storage = db.storage.from(MEDIA_BUCKET);
  const entries: ZipEntry[] = rows.map((row, i) => ({
    name: `kormem-${String(i + 1).padStart(3, "0")}-${row.media_type}.${extensionFor(row.mime_type)}`,
    mtime: new Date(row.created_at),
    open: async () => {
      // Lazy per-entry fetch keeps exactly one download in flight.
      const { data: signed } = await storage.createSignedUrl(
        row.storage_path,
        SIGNED_URL_TTL
      );
      if (!signed) return null;
      const res = await fetch(signed.signedUrl);
      if (!res.ok || !res.body) return null;
      return res.body;
    },
  }));

  const filename = `kormem-${slug}.zip`;
  return new Response(zipStream(entries), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
