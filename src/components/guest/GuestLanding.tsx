"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { PublicEvent } from "@/lib/types";
import { STYLE_COVER } from "@/lib/filters";
import { formatDateTime } from "@/lib/format";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowRight, CameraIcon, ClockIcon, Mark } from "@/components/icons";

/**
 * The guest's first impression: an invitation card. Cover tinted by the
 * event's film preset, serif event name, shots remaining, one button.
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
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-6">
      {/* cover wash in the event's film tone */}
      <div
        aria-hidden
        className="film-grain pointer-events-none absolute inset-0"
        style={{ background: STYLE_COVER[event.filterPreset] }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-bg via-bg/60 to-transparent" />

      <header className="relative flex items-center justify-between pt-6">
        <span className="flex items-center gap-2">
          <Mark size={15} className="text-accent" />
          <span className="font-serif-display text-xl">Korme</span>
        </span>
        <LanguageSwitcher />
      </header>

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-end pb-9 text-center">
        <span className="rounded-full border border-line bg-bg/50 px-4 py-2 text-sm text-ink/80 backdrop-blur">
          {t("welcomeLine")}
        </span>
        <h1 className="font-serif-display mt-6 text-5xl leading-[1.08]">{event.name}</h1>
        <p className="mt-5 flex items-center gap-5 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <ClockIcon size={15} /> {formatDateTime(event.eventDate, locale)}
          </span>
          <span className="flex items-center gap-1.5">
            <CameraIcon size={15} /> {t("shotsCount", { shots: shotsLeft })}
          </span>
        </p>

        <div className="mt-9 w-full">
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
              <p className="mt-2.5 text-sm text-muted">{t("nameHint")}</p>
            </>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 p-3.5 text-sm text-danger"
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
            {pending ? (
              <Mark size={18} className="animate-spin" />
            ) : (
              <>
                {existing ? t("continueShooting") : t("startShooting")}
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="mt-4 text-xs leading-relaxed text-muted">{t("noAppNeeded")}</p>
        </div>
      </div>
    </main>
  );
}
