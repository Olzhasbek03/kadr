"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PublicEvent } from "@/lib/types";
import { filterCss } from "@/lib/filters";
import { formatDateTime } from "@/lib/format";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Countdown from "@/components/dashboard/Countdown";
import {
  ArrowLeft,
  ArrowRight,
  DownloadIcon,
  FilmIcon,
  LockIcon,
  Mark,
  XIcon,
} from "@/components/icons";

interface GalleryPhoto {
  id: string;
  url: string | null;
  thumbUrl: string | null;
  filter: string;
  guestName: string | null;
  mine: boolean;
}

type Phase = "locked" | "unlocking" | "revealed" | "error";

/**
 * The reveal is the product's signature moment:
 * locked (countdown) → "developing" interlude → photos develop in, staggered.
 * The server enforces the gate — before reveal the gallery API returns 403,
 * so this screen can't leak photos even if the clock is wrong.
 */
export default function GuestGallery({
  event,
  initiallyRevealed,
}: {
  event: PublicEvent;
  initiallyRevealed: boolean;
}) {
  const t = useTranslations("gallery");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [phase, setPhase] = useState<Phase>(initiallyRevealed ? "unlocking" : "locked");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/e/${event.slug}/gallery`);
      if (res.status === 403) {
        setPhase("locked"); // server says not yet — respect it
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setPhotos(data.photos);
      // Hold the darkroom interlude briefly, then develop the grid in.
      setTimeout(() => setPhase("revealed"), 1400);
    } catch {
      setPhase("error");
    }
  }, [event.slug]);

  useEffect(() => {
    if (phase === "unlocking") void load();
  }, [phase, load]);

  // Flip to unlocking the moment the countdown crosses zero.
  useEffect(() => {
    if (phase !== "locked") return;
    const ms = new Date(event.revealAt).getTime() - Date.now();
    if (ms <= 0) {
      setPhase("unlocking");
      return;
    }
    const id = setTimeout(() => setPhase("unlocking"), ms + 800);
    return () => clearTimeout(id);
  }, [phase, event.revealAt]);

  // ── locked: photos are developing ─────────────────────────────────
  if (phase === "locked") {
    return (
      <main className="relative flex min-h-dvh flex-col px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_55%_at_50%_10%,#241a0e_0%,#120e09_50%,#0c0a08_100%)]" />
        <header className="relative flex items-center justify-between pt-6">
          <span className="flex items-center gap-2">
            <Mark size={15} className="text-accent" />
            <span className="font-serif-display text-xl">Korme</span>
          </span>
          <LanguageSwitcher />
        </header>

        <div className="relative flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <span className="pulse-glow flex h-20 w-20 items-center justify-center rounded-full border border-line text-accent">
            <LockIcon size={28} />
          </span>
          <p className="microlabel mt-9">{event.name}</p>
          <h1 className="font-serif-display mt-3 max-w-sm text-4xl leading-[1.12]">
            {t("lockedTitle")}
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            {t("lockedText", { time: formatDateTime(event.revealAt, locale) })}
          </p>
          <div className="mt-11">
            <Countdown target={event.revealAt} />
          </div>
        </div>
      </main>
    );
  }

  // ── unlocking: the darkroom moment ────────────────────────────────
  if (phase === "unlocking") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <span className="pulse-glow flex h-24 w-24 items-center justify-center rounded-full border border-accent/40 text-accent">
          <FilmIcon size={34} className="animate-pulse" />
        </span>
        <h1 className="font-serif-display mt-9 text-4xl">{t("unlockingTitle")}</h1>
        <div className="mt-7 h-px w-48 overflow-hidden rounded bg-line">
          <div className="develop-progress h-full bg-accent" />
        </div>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="text-muted">{tc("error")}</p>
        <button type="button" onClick={() => setPhase("unlocking")} className="btn-secondary">
          {tc("retry")}
        </button>
      </main>
    );
  }

  // ── revealed ──────────────────────────────────────────────────────
  return (
    <main className="min-h-dvh pb-20">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <span className="flex items-center gap-2">
          <Mark size={15} className="text-accent" />
          <span className="font-serif-display text-xl">Korme</span>
        </span>
        <LanguageSwitcher />
      </header>

      <div className="mx-auto max-w-5xl px-5">
        <p className="microlabel">{t("revealedKicker")}</p>
        <h1 className="font-serif-display mt-2 text-4xl leading-tight sm:text-5xl">
          {event.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t("photoCount", { count: photos.length })}
        </p>

        {photos.length === 0 ? (
          <p className="mt-14 text-center text-muted">{t("empty")}</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightbox(i)}
                className="develop-in group relative aspect-square overflow-hidden rounded-lg bg-surface"
                style={{ ["--dev-delay" as string]: `${Math.min(i, 14) * 70}ms`, minHeight: 0 }}
                aria-label={photo.guestName ?? `photo ${i + 1}`}
              >
                {photo.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.thumbUrl}
                    alt=""
                    loading={i < 12 ? "eager" : "lazy"}
                    className="h-full w-full object-cover transition group-active:scale-95"
                    style={{ filter: filterCss(photo.filter) }}
                  />
                )}
                {photo.mine && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[0.68rem] font-semibold text-accent-strong backdrop-blur">
                    {t("mine")}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between p-4">
            <span className="pl-2 text-sm text-muted">
              {photos[lightbox].guestName ?? ""}
              <span className="stat-numeral ml-3 text-base text-ink">
                {lightbox + 1} / {photos.length}
              </span>
            </span>
            <button type="button" className="icon-btn" aria-label={tc("close")}>
              <XIcon size={18} />
            </button>
          </div>
          <div
            className="flex flex-1 items-center justify-center overflow-hidden px-3"
            onClick={(e) => e.stopPropagation()}
          >
            {photos[lightbox].url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photos[lightbox].url!}
                alt=""
                className="max-h-full max-w-full rounded-lg object-contain"
                style={{ filter: filterCss(photos[lightbox].filter) }}
              />
            )}
          </div>
          <div
            className="flex items-center justify-between gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={lightbox === 0}
              onClick={() => setLightbox(lightbox - 1)}
              className="icon-btn disabled:opacity-40"
              aria-label={tc("previous")}
            >
              <ArrowLeft size={18} />
            </button>
            <a
              href={photos[lightbox].url ?? "#"}
              download={`kadr-${photos[lightbox].id}.jpg`}
              className="btn btn-primary !min-h-[52px]"
            >
              <DownloadIcon size={17} /> {t("download")}
            </a>
            <button
              type="button"
              disabled={lightbox >= photos.length - 1}
              onClick={() => setLightbox(lightbox + 1)}
              className="icon-btn disabled:opacity-40"
              aria-label={tc("next")}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
