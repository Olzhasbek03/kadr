"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

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
