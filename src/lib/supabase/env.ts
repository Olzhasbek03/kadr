/**
 * Supabase env vars keep arriving from the dashboard with stray whitespace
 * or copy-pasted wrapping quotes (e.g. value pasted as `"https://x.supabase.co"`
 * literally, quotes included), which breaks `new URL()` with a cryptic
 * "Invalid supabaseUrl" error. Strip both before use.
 */
function clean(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "").trim();
}

export function supabaseUrl(): string {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") || "https://placeholder.supabase.co";
}

export function supabaseAnonKey(): string {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "") || "placeholder-anon-key";
}

export function supabaseServiceRoleKey(): string {
  return clean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "") || "placeholder-service-role-key";
}
