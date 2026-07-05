import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client — bypasses RLS. Used ONLY inside API routes that
 * implement the guest flow (join / upload / gallery), where access rules
 * are enforced explicitly in server code.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service-role-key",
      { auth: { persistSession: false } }
    );
  }
  return adminClient;
}

/** Private bucket holding every guest capture (photos, video, voice). */
export const MEDIA_BUCKET = "media";
/** Signed URL lifetime, seconds. */
export const SIGNED_URL_TTL = 60 * 60;
