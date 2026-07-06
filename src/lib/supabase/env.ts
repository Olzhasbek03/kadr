/**
 * Supabase env vars keep arriving from dashboards mangled: stray whitespace,
 * copy-pasted wrapping quotes, a whole `KEY=value` line pasted as the value,
 * a URL missing its scheme, or the URL and API key pasted into each other's
 * fields. Each of those has broken production login at least once (the last
 * one made the browser DNS-resolve `sb_publishable_...` as a hostname).
 * Normalize aggressively, refuse key-shaped values as URLs, and heal the
 * swapped-fields case outright.
 */
function clean(value: string): string {
  let v = value.trim();
  // A full dotenv line pasted into the value field: NEXT_PUBLIC_X="..."
  const eq = v.match(/^[A-Z0-9_]+\s*=\s*(.*)$/);
  if (eq) v = eq[1].trim();
  // Wrapping quotes (either kind), possibly doubled.
  v = v.replace(/^["']+|["']+$/g, "").trim();
  // Trailing separators from sloppy copies.
  v = v.replace(/[,;]+$/g, "").trim();
  return v;
}

/** Supabase API keys: new-format `sb_publishable_...` / `sb_secret_...`,
 *  or a legacy JWT (`eyJ...`). None of these is ever a URL. */
function looksLikeKey(v: string): boolean {
  return /^(sb_publishable_|sb_secret_|ey[A-Za-z0-9_-]{20,})/.test(v);
}

function cleanUrl(value: string): string {
  let v = clean(value);
  if (!v || looksLikeKey(v)) return "";
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  // Reject anything that still isn't a URL rather than crash downstream.
  // Keep the path: self-hosted Supabase can live behind a path prefix.
  try {
    const u = new URL(v);
    // A hostname with no dot cannot be a reachable Supabase instance;
    // it's a pasted token or a typo.
    if (!u.hostname.includes(".")) return "";
    return (u.origin + u.pathname).replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function rawUrlVar(): string {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
}

function rawKeyVar(): string {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
}

export function supabaseUrl(): string {
  const url = cleanUrl(rawUrlVar());
  if (url) return url;
  // The classic swap: the key landed in the URL field and vice versa.
  if (looksLikeKey(rawUrlVar())) {
    const swapped = cleanUrl(rawKeyVar());
    if (swapped) return swapped;
  }
  return "https://placeholder.supabase.co";
}

export function supabaseAnonKey(): string {
  const key = rawKeyVar();
  if (looksLikeKey(key)) return key;
  // Swapped-fields healing, mirroring supabaseUrl().
  if (looksLikeKey(rawUrlVar())) return rawUrlVar();
  return key || "placeholder-anon-key";
}

export function supabaseServiceRoleKey(): string {
  return (
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "") || "placeholder-service-role-key"
  );
}

/** True when a plausible URL AND a key-shaped anon key are configured;
 *  anything else means no auth call can succeed and the login page should
 *  say so instead of failing mutely. */
export function supabaseConfigured(): boolean {
  return (
    supabaseUrl() !== "https://placeholder.supabase.co" &&
    looksLikeKey(supabaseAnonKey())
  );
}
