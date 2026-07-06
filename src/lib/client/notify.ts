"use client";

/**
 * "Your camera is ready" notification, shown once per event right after a
 * guest joins (the same move Once makes with its lock-screen activity).
 *
 * Split in two on purpose:
 * - `primeNotificationPermission` runs inside the join tap, so the
 *   permission prompt is gesture-backed (Safari requires it).
 * - `announceCameraReady` runs only after the join request succeeded, so
 *   a failed join never burns the once-per-event flag; the flag itself is
 *   written only after a delivery path actually worked, because Android
 *   Chrome forbids page-scoped `new Notification()` and the service worker
 *   may still be activating on a first visit.
 *
 * On iOS Safari outside an installed PWA the API doesn't exist and both
 * calls are silent no-ops.
 */

function flagKey(slug: string) {
  return `kormem-notified-${slug}`;
}

export function primeNotificationPermission(slug: string): void {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      if (localStorage.getItem(flagKey(slug))) return;
    } catch {
      /* storage unavailable; asking twice is the worst case */
    }
    if (Notification.permission === "default") {
      void Notification.requestPermission().catch(() => {});
    }
  } catch {
    /* notifications are a garnish; never break the join flow */
  }
}

export async function announceCameraReady(
  slug: string,
  title: string,
  body: string
): Promise<void> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const flag = flagKey(slug);
    try {
      if (localStorage.getItem(flag)) return;
    } catch {
      /* fine */
    }

    let delivered = false;
    // Preferred path: the guest service worker (works on Android Chrome).
    // `ready` waits for activation; cap the wait so a stuck registration
    // can't hold the promise forever.
    try {
      if (navigator.serviceWorker) {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((r) => setTimeout(() => r(null), 4000)),
        ]);
        if (reg) {
          await reg.showNotification(title, {
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: `kormem-ready-${slug}`,
          });
          delivered = true;
        }
      }
    } catch {
      /* fall through to the page-scoped notification */
    }
    if (!delivered) {
      try {
        new Notification(title, { body, icon: "/icons/icon-192.png" });
        delivered = true;
      } catch {
        /* Android only allows SW notifications; leave the flag unset so a
           later visit (with the worker active) can still deliver */
      }
    }
    if (delivered) {
      try {
        localStorage.setItem(flag, "1");
      } catch {
        /* best effort */
      }
    }
  } catch {
    /* never break the join flow */
  }
}
