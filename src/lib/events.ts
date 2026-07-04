import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { EventRow, RevealMode } from "@/lib/types";

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("getEventBySlug:", error.message);
    return null;
  }
  return data as EventRow | null;
}

/** Resolve reveal_at from the chosen mode at creation time. */
export function computeRevealAt(
  mode: RevealMode,
  endTime: Date,
  custom: Date | null,
  now = new Date()
): Date {
  switch (mode) {
    case "instant":
      return now;
    case "event_end":
      return endTime;
    case "custom":
      return custom ?? endTime;
  }
}

// Unambiguous alphabet (no 0/O, 1/l/I) so slugs survive being read aloud
// or typed from a printed card.
const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function newSlug(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return out;
}
