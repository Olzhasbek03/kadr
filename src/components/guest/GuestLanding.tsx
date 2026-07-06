"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { PublicEvent } from "@/lib/types";
import type { CoverTemplate } from "@/lib/covers";
import { STYLE_COVER } from "@/lib/filters";
import { formatDateTime } from "@/lib/format";
import { announceCameraReady, primeNotificationPermission } from "@/lib/client/notify";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AddToHomeScreen from "@/components/guest/AddToHomeScreen";
import { ArrowRight, CameraIcon, ClockIcon } from "@/components/icons";

/** Visual vocabulary of each invitation template. The host picked one at
 *  event creation; the guest's first screen is that card, full-bleed. */
const TEMPLATE_STYLES: Record<
  CoverTemplate,
  {
    dark: boolean;
    surface?: string;
    framed: boolean;
  }
> = {
  classic: { dark: false, framed: false },
  botanical: { dark: true, surface: "#28331f", framed: true },
  noir: { dark: true, surface: "#151512", framed: false },
};

export default function GuestLanding({
  event,
  existing,
}: {
  event: PublicEvent;
  existing: { name: string | null; shotsLeft: number } | null;
}) {
  const t = useTranslations("guest");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState(existing?.name ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const shotsLeft = existing?.shotsLeft ?? event.shotsPerGuest;
  const tpl = TEMPLATE_STYLES[event.coverTemplate];

  const start = async () => {
    if (pending) return;
    setPending(true);
    setError(false);
    // Inside the tap, so the permission prompt is gesture-backed; the
    // notification itself only fires after the join succeeds below.
    primeNotificationPermission(event.slug);
    try {
      // localStorage mirror lets the session survive a cleared cookie.
      let storedToken: string | null = null;
      try {
        storedToken = localStorage.getItem("kormem-device");
      } catch {
        /* private mode without storage: cookie-only is fine */
      }
      const res = await fetch(`/api/e/${event.slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          deviceToken: storedToken || undefined,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json().catch(() => ({}));
      if (typeof data.deviceToken === "string") {
        try {
          localStorage.setItem("kormem-device", data.deviceToken);
        } catch {
          /* best effort */
        }
      }
      // Joined for real: the Once-style "camera is ready" note may fire.
      void announceCameraReady(
        event.slug,
        t("notifyTitle", { event: event.name }),
        t("notifyBody", { shots: shotsLeft })
      );
      router.push(`/e/${event.slug}/camera`);
    } catch {
      setError(true);
      setPending(false);
    }
  };

  const inputClass = tpl.dark
    ? "w-full rounded-[4px] border border-ivory/25 bg-ivory/10 px-4 py-3.5 text-center text-ivory outline-none transition-colors placeholder:text-ivory/80 focus:border-ivory/60"
    : "input-base text-center";

  const metaClass = tpl.dark ? "text-ivory/65" : "text-ink-2";
  const fineClass = tpl.dark ? "text-ivory/55" : "text-ink-2";

  const form = (
    <div className="rise-in mt-auto w-full pt-10" style={{ animationDelay: "220ms" }}>
      {!existing && (
        <>
          <label htmlFor="guest-name" className="sr-only">
            {t("namePlaceholder")}
          </label>
          <input
            id="guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            className={inputClass}
          />
          <p className={`mt-2.5 text-sm ${fineClass}`}>{t("nameHint")}</p>
        </>
      )}
      {error && (
        <p
          role="alert"
          className={`mt-4 rounded-[10px] border p-3.5 text-sm ${
            tpl.dark
              ? "border-red-300/40 bg-red-300/10 text-red-200"
              : "border-danger/40 bg-danger/5 text-danger"
          }`}
        >
          {tc("error")}
        </p>
      )}
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className={`${tpl.dark ? "btn-dark" : "btn-primary"} mt-4 w-full`}
      >
        {pending ? "…" : existing ? t("continueShooting") : t("startShooting")}
        {!pending && <ArrowRight size={18} />}
      </button>
      <p className={`mt-4 text-xs leading-relaxed ${fineClass}`}>{t("noAppNeeded")}</p>

      <AddToHomeScreen slug={event.slug} />

      <p className={`mt-4 text-xs ${fineClass}`}>
        <Link
          href="/privacy"
          className={`underline underline-offset-4 transition-colors ${
            tpl.dark ? "hover:text-ivory" : "hover:text-ink"
          }`}
        >
          {t("privacyLink")}
        </Link>
      </p>
    </div>
  );

  const heart = (
    <>
      <p className={`rise-in text-sm ${metaClass}`}>{t("welcomeLine")}</p>
      <h1
        className={`rise-in font-display mt-3 text-[2.6rem] leading-[1.08] ${
          tpl.dark ? "text-ivory" : ""
        }`}
        style={{ animationDelay: "80ms" }}
      >
        {event.name}
      </h1>
      <p
        className={`rise-in mt-4 flex items-center justify-center gap-5 text-sm ${metaClass}`}
        style={{ animationDelay: "150ms" }}
      >
        <span className="flex items-center gap-1.5">
          <ClockIcon size={15} /> {formatDateTime(event.eventDate, locale)}
        </span>
        <span className="flex items-center gap-1.5">
          <CameraIcon size={15} /> {t("shotsCount", { shots: shotsLeft })}
        </span>
      </p>
    </>
  );

  if (tpl.dark) {
    // Botanical and noir: a full-bleed evening invitation card.
    return (
      <main
        className="flex min-h-dvh flex-col text-ivory"
        style={{ background: tpl.surface }}
      >
        <header className="flex items-center justify-between px-5 pt-5">
          <span className="font-display text-xl text-ivory">Kormem</span>
          <span className="rounded-full bg-ivory/10 px-2 py-1">
            <LanguageSwitcher />
          </span>
        </header>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pb-10 pt-6 text-center">
          <div
            className={`flex flex-1 flex-col items-center pt-14 ${
              tpl.framed
                ? "rounded-[12px] border border-ivory/25 px-5 pb-8 shadow-[inset_0_0_0_5px_transparent,inset_0_0_0_6px_rgba(250,248,245,0.14)]"
                : ""
            }`}
          >
            {heart}
            {form}
          </div>
        </div>
      </main>
    );
  }

  // Classic: film-tone cover dissolving into parchment.
  return (
    <main className="flex min-h-dvh flex-col">
      <div className="relative h-[34dvh] min-h-[210px]">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: STYLE_COVER[event.filterPreset] }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent"
        />
        <header className="relative flex items-center justify-between px-5 pt-5 text-ink">
          <span className="font-display text-xl">Kormem</span>
          <LanguageSwitcher />
        </header>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pb-10 text-center">
        {heart}
        {form}
      </div>
    </main>
  );
}
