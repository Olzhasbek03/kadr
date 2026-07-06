"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  onInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/client/installPrompt";
import { PlusIcon, ShareIcon, XIcon } from "@/components/icons";

/**
 * "Add to Home Screen" nudge on the guest join page. Android Chrome gets
 * the real install prompt (captured at module scope, so it survives firing
 * before mount and client-side navigation); iOS Safari has no API, so it
 * gets one-line share-sheet instructions. Installed guests reopen straight
 * into the event camera all night. Dismissal sticks per event.
 */
export default function AddToHomeScreen({ slug }: { slug: string }) {
  const t = useTranslations("guest");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    try {
      if (sessionStorage.getItem(`kormem-a2hs-${slug}`)) return;
    } catch {
      /* fine, show it */
    }
    setDismissed(false);

    // iPadOS 13+ Safari masquerades as macOS; the touch-point count is the tell.
    const ua = navigator.userAgent;
    const isIos =
      /iphone|ipad|ipod/i.test(ua) ||
      (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (isIos) setPlatform("ios");

    return onInstallPrompt((e) => {
      setInstallEvent(e);
      setPlatform("android");
    });
  }, [slug]);

  if (dismissed || !platform) return null;

  const dismiss = () => {
    setDismissed(true);
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
      if (choice.outcome === "accepted") setDismissed(true);
    } catch {
      dismiss();
    }
  };

  return (
    <div className="fade-in relative mt-6 rounded-[12px] border border-line bg-surface p-4 text-left">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("installDismiss")}
        className="absolute right-2 top-2 flex !min-h-0 h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:bg-ink/5 hover:text-ink"
      >
        <XIcon size={14} />
      </button>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line text-accent">
          <PlusIcon size={17} />
        </span>
        <div className="min-w-0 pr-6">
          <p className="text-sm font-medium text-ink">{t("installTitle")}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{t("installText")}</p>
        </div>
      </div>

      {platform === "android" && installEvent ? (
        <button
          type="button"
          onClick={install}
          className="btn-primary mt-4 !min-h-[46px] w-full text-sm"
        >
          <PlusIcon size={16} /> {t("installButton")}
        </button>
      ) : (
        // iOS has no install API; show the exact two taps with real glyphs.
        <ol className="mt-3 space-y-2 border-t border-line pt-3 text-sm text-ink-2">
          <li className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/5 text-accent">
              <ShareIcon size={14} />
            </span>
            {t("installIosStep1")}
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/5 text-accent">
              <PlusIcon size={14} />
            </span>
            {t("installIosStep2")}
          </li>
        </ol>
      )}
    </div>
  );
}
