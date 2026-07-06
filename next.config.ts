import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** Baseline security headers for every response. CSP is intentionally not
 *  set here yet: Next inline hydration scripts need nonces or hashes, and
 *  a broken CSP is worse than none; revisit with nonce plumbing. */
const securityHeaders = [
  // HTTPS always (Vercel serves HTTPS; this pins browsers to it).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // No MIME sniffing on uploads served back to guests.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The app is never legitimately framed (print pages open as tabs).
  { key: "X-Frame-Options", value: "DENY" },
  // Signed storage URLs must not leak via Referer to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera/mic are used by this origin itself; everything else is off.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  webpack: (config) => {
    // face-api's bundled tfjs uses a dynamic require that webpack cannot
    // statically trace; it is browser-only and loaded via dynamic import.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /@vladmandic\/face-api/ },
    ];
    return config;
  },
};

export default withNextIntl(nextConfig);
