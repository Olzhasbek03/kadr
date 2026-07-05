import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client — bypasses RLS. Used ONLY inside API routes that
 * implement the guest flow (join / upload / gallery), where access rules
 * are enforced explicitly in server code.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(supabaseUrl(), supabaseServiceRoleKey(), {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}

/** Private bucket holding every guest capture (photos, video, voice). */
export const MEDIA_BUCKET = "media";
/** Signed URL lifetime, seconds. */
export const SIGNED_URL_TTL = 60 * 60;
