"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { PublicEvent } from "@/lib/types";
import { STYLE_COVER } from "@/lib/filters";
import { formatDateTime } from "@/lib/format";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowRight, CameraIcon, ClockIcon } from "@/components/icons";

/**
 * The guest's first impression: an ivory invitation. A soft cover in the
 * event's film tone, the event name in Prata, one button to the camera.
 */
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

  const start = async () => {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const res = await fetch(`/api/e/${event.slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.push(`/e/${event.slug}/camera`);
    } catch {
      setError(true);
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col">
      {/* cover in the event's film tone, dissolving into ivory */}
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
        <p className="rise-in text-sm text-ink-2">{t("welcomeLine")}</p>
        <h1
          className="rise-in font-display mt-3 text-[2.4rem] leading-[1.12]"
          style={{ animationDelay: "80ms" }}
        >
          {event.name}
        </h1>
        <p
          className="rise-in mt-4 flex items-center justify-center gap-5 text-sm text-ink-2"
          style={{ animationDelay: "150ms" }}
        >
          <span className="flex items-center gap-1.5">
            <ClockIcon size={15} /> {formatDateTime(event.eventDate, locale)}
          </span>
          <span className="flex items-center gap-1.5">
            <CameraIcon size={15} /> {t("shotsCount", { shots: shotsLeft })}
          </span>
        </p>

        <div className="rise-in mt-auto pt-10" style={{ animationDelay: "220ms" }}>
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
                className="input-base text-center"
              />
              <p className="mt-2.5 text-sm text-ink-2">{t("nameHint")}</p>
            </>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-[10px] border border-danger/40 bg-danger/5 p-3.5 text-sm text-danger"
            >
              {tc("error")}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={pending}
            className="btn-primary mt-4 w-full"
          >
            {pending ? "…" : existing ? t("continueShooting") : t("startShooting")}
            {!pending && <ArrowRight size={18} />}
          </button>
          <p className="mt-4 text-xs leading-relaxed text-ink-2">{t("noAppNeeded")}</p>
        </div>
      </div>
    </main>
  );
}
