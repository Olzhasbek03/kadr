"use client";

import { useEffect } from "react";
// Evaluated for its side effect: captures `beforeinstallprompt` on every
// guest route, however early it fires, so the join page's install card
// still works after client-side navigation.
import "@/lib/client/installPrompt";

/** Registers the guest-scope service worker. Renders nothing. */
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/e/" })
      .catch(() => {
        /* PWA is progressive enhancement; the page works without it */
      });
  }, []);
  return null;
}
