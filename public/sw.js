/**
 * Kormem guest service worker. Registered with scope "/e/" — it only ever
 * touches guest pages. Static assets are cached-first; guest navigations
 * are network-first with a cached fallback so a reopened home-screen app
 * still shows the last good page on flaky venue wifi. Uploads and API
 * calls are never intercepted: the IndexedDB queue owns retry semantics.
 */
const CACHE = "kormem-guest-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API responses (signed URLs, allowances go stale instantly).
  if (url.pathname.startsWith("/api/")) return;

  // Immutable build assets + icons: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })()
    );
    return;
  }

  // Guest page navigations: network-first, cache fallback.
  if (request.mode === "navigate" && url.pathname.startsWith("/e/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          const hit = await cache.match(request);
          if (hit) return hit;
          throw new Error("offline");
        }
      })()
    );
  }
});
