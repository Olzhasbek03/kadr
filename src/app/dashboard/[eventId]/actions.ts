"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { MEDIA_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";

/** Host control: unlock the gallery immediately. RLS scopes the update
 *  to the signed-in host's own events. */
export async function revealNow(eventId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("events")
    .update({ reveal_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) return { ok: false };

  revalidatePath(`/dashboard/${eventId}`);
  return { ok: true };
}

/**
 * Moderation: remove one guest capture (photo, video or voice) from the
 * host's own event. The row delete runs under the host's RLS session — it
 * silently touches nothing if the event isn't theirs — and only then is
 * storage cleaned up with the service key.
 */
export async function deleteMedia(eventId: string, mediaId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: row } = await supabase
    .from("media")
    .select("id, storage_path, thumb_path")
    .eq("id", mediaId)
    .eq("event_id", eventId)
    .maybeSingle<{ id: string; storage_path: string; thumb_path: string | null }>();
  if (!row) return { ok: false };

  const { error } = await supabase.from("media").delete().eq("id", mediaId);
  if (error) return { ok: false };

  // Best-effort storage cleanup; an orphaned file is invisible (private
  // bucket, no row pointing at it) and costs at most a few hundred KB.
  const paths = [row.storage_path, ...(row.thumb_path ? [row.thumb_path] : [])];
  await supabaseAdmin()
    .storage.from(MEDIA_BUCKET)
    .remove(paths)
    .then(
      () => {},
      () => {}
    );

  revalidatePath(`/dashboard/${eventId}`);
  return { ok: true };
}
