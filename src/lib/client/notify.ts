"use client";

/**
 * "Your camera is ready" notification, shown once per event right after a
 * guest joins (the same move Once makes with its lock-screen activity).
 * Permission is requested inside the join tap (a user gesture, so Safari
 * allows the prompt); delivery goes through the guest service worker when
 * it's registered, falling back to a page-scoped Notification. On iOS
 * Safari outside an installed PWA the API simply doesn't exist and this
 * is a silent no-op.
 */
export function announceCameraReady(slug: string, title: string, body: string): void {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const flag = `kormem-notified-${slug}`;
    try {
      if (localStorage.getItem(flag)) return;
    } catch {
      /* storage may be unavailable; worst case we ask again */
    }

    const show = async () => {
      try {
        localStorage.setItem(flag, "1");
      } catch {
        /* best effort */
      }
      try {
        const reg = await navigator.serviceWorker?.getRegistration(`/e/${slug}`);
        if (reg) {
          await reg.showNotification(title, {
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: `kormem-ready-${slug}`,
          });
          return;
        }
      } catch {
        /* fall through to the page-scoped notification */
      }
      try {
        new Notification(title, { body, icon: "/icons/icon-192.png" });
      } catch {
        /* some platforms only allow SW notifications; nothing to do */
      }
    };

    if (Notification.permission === "granted") {
      void show();
    } else if (Notification.permission === "default") {
      // Called from the join tap, so the prompt is gesture-backed.
      void Notification.requestPermission().then((p) => {
        if (p === "granted") void show();
      });
    }
  } catch {
    /* notifications are a garnish; never break the join flow */
  }
}
