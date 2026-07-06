/**
 * Supabase env vars keep arriving from dashboards mangled: stray whitespace,
 * copy-pasted wrapping quotes, a whole `KEY=value` line pasted as the value,
 * or a URL missing its scheme. Each of those breaks `new URL()` inside the
 * Supabase client with a cryptic "Invalid supabaseUrl" that took down
 * production login once already. Normalize aggressively before use.
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

function cleanUrl(value: string): string {
  let v = clean(value);
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  // Reject anything that still isn't a URL rather than crash downstream.
  // Keep the path: self-hosted Supabase can live behind a path prefix.
  try {
    const u = new URL(v);
    return (u.origin + u.pathname).replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function supabaseUrl(): string {
  return (
    cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") ||
    "https://placeholder.supabase.co"
  );
}

export function supabaseAnonKey(): string {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "") || "placeholder-anon-key";
}

export function supabaseServiceRoleKey(): string {
  return (
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "") || "placeholder-service-role-key"
  );
}

/** True when a real URL AND anon key are configured (not the crash-guard
 *  placeholders); either one missing means no auth call can succeed. */
export function supabaseConfigured(): boolean {
  return (
    supabaseUrl() !== "https://placeholder.supabase.co" &&
    supabaseAnonKey() !== "placeholder-anon-key"
  );
}
