"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  onInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/client/installPrompt";
import { PlusIcon, ShareIcon, XIcon } from "@/components/icons";

type Platform = "android" | "ios" | "other";

/**
 * "Add to Home Screen" helper — deliberately explicit, because guests are
 * non-technical and every platform hides the control somewhere different:
 *
 * - Android Chrome: a real one-tap install button (captured `beforeinstall
 *   prompt`), plus the menu path as a fallback.
 * - iOS Safari: no install API exists, so it walks through the exact taps
 *   (Share → Add to Home Screen) with the real Share glyph and points to
 *   where the button lives.
 * - Anything else (desktop, in-app browsers): tells them to open the link
 *   on their phone.
 *
 * Rendered as a slide-up sheet so it's impossible to miss, dismissible per
 * event per session. Installed guests reopen straight into the event.
 */
export default function AddToHomeScreen({ slug }: { slug: string }) {
  const t = useTranslations("guest");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return; // already installed

    try {
      if (sessionStorage.getItem(`kormem-a2hs-${slug}`)) return;
    } catch {
      /* fine, show it */
    }

    const ua = navigator.userAgent;
    const isIos =
      /iphone|ipad|ipod/i.test(ua) ||
      (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(ua);
    setPlatform(isIos ? "ios" : isAndroid ? "android" : "other");

    // Slide it in a beat after arrival, not the instant the page paints.
    const show = setTimeout(() => setOpen(true), 1400);
    const off = onInstallPrompt((e) => {
      setInstallEvent(e);
      setPlatform("android");
    });
    return () => {
      clearTimeout(show);
      off();
    };
  }, [slug]);

  if (!platform) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(`kormem-a2hs-${slug}`, "1");
    } catch {
      /* best effort */
    }
  };

  const install = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") dismiss();
    } catch {
      /* keep the sheet open with the manual steps */
    }
  };

  const Step = ({ n, icon, children }: { n: number; icon?: React.ReactNode; children: React.ReactNode }) => (
    <li className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
        {n}
      </span>
      <span className="flex items-center gap-1.5 text-sm leading-snug text-ink">
        {children}
        {icon && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-ink/5 text-accent">
            {icon}
          </span>
        )}
      </span>
    </li>
  );

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 ${
        open ? "translate-y-0" : "translate-y-full"
      }`}
      role="dialog"
      aria-modal="false"
      aria-label={t("installTitle")}
    >
      <div className="mx-auto max-w-md rounded-t-[20px] border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(24,27,20,0.12)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-line bg-bg">
            {/* app icon; swap for the brand logo once installed */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="h-full w-full object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{t("installTitle")}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{t("installText")}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("installDismiss")}
            className="flex !min-h-0 h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-ink/5 hover:text-ink"
          >
            <XIcon size={15} />
          </button>
        </div>

        {platform === "android" && installEvent ? (
          <>
            <button
              type="button"
              onClick={install}
              className="btn-primary mt-4 !min-h-[48px] w-full"
            >
              <PlusIcon size={17} /> {t("installButton")}
            </button>
            <p className="mt-2.5 text-center text-xs leading-relaxed text-ink-2">
              {t("installAndroidHint")}
            </p>
          </>
        ) : platform === "ios" ? (
          <ol className="mt-4 space-y-2.5 border-t border-line pt-4">
            <Step n={1} icon={<ShareIcon size={14} />}>
              {t("installIosStep1")}
            </Step>
            <Step n={2}>{t("installIosStep2")}</Step>
            <Step n={3}>{t("installIosStep3")}</Step>
          </ol>
        ) : platform === "android" ? (
          <ol className="mt-4 space-y-2.5 border-t border-line pt-4">
            <Step n={1}>{t("installAndroidMenu")}</Step>
            <Step n={2}>{t("installAndroidChoose")}</Step>
          </ol>
        ) : (
          <p className="mt-4 rounded-[10px] border border-line bg-bg p-3.5 text-sm leading-relaxed text-ink-2">
            {t("installOther")}
          </p>
        )}
      </div>
    </div>
  );
}
