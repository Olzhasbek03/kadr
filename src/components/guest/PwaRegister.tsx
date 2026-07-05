"use client";

import { useEffect } from "react";

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
