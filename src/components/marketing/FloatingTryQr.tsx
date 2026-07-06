"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QrCode from "@/components/QrCode";
import { XIcon } from "@/components/icons";
import { config } from "@/lib/config";

/** Persistent QR card, docked on screen while scrolling past the hero —
 *  same pattern disposable-camera apps use so the QR is never more than
 *  a glance away. Dismissible; stays dismissed for the browser tab. */
export default function FloatingTryQr() {
  const t = useTranslations("landing");
  const [past, setPast] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("kormem_try_qr_dismissed") === "1") {
      setDismissed(true);
    }
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("kormem_try_qr_dismissed", "1");
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 transition-[opacity,transform] duration-500 sm:bottom-8 sm:right-8 ${
        past ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
      aria-hidden={!past}
    >
      <div className="card relative flex max-w-[260px] flex-col items-center gap-3 p-5 text-center shadow-xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("tryDismiss")}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <XIcon size={14} />
        </button>
        <p className="mono-badge uppercase tracking-[0.25em]">{t("tryKicker")}</p>
        <div className="shrink-0 rounded-[12px] border border-line bg-surface p-2">
          <QrCode value={`${config.appUrl}/try`} size={104} />
        </div>
        <p className="text-sm leading-[1.4] text-ink-2">{t("tryTitle")}</p>
      </div>
    </div>
  );
}
