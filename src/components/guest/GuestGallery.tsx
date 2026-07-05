"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PublicEvent } from "@/lib/types";
import { filterCss, STYLE_COVER } from "@/lib/filters";
import { formatDateTime } from "@/lib/format";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Countdown from "@/components/dashboard/Countdown";
import {
  ArrowLeft,
  ArrowRight,
  DownloadIcon,
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
 * The reveal is the product's signature moment: locked (the photos sleep
 * under a veil) → the veil lifts → the gallery develops in. The server
 * enforces the gate; before reveal the API returns 403, so this screen
 * can't leak photos even if the device clock lies.
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
        setPhase("locked"); // the server says not yet; respect it
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setPhotos(data.photos);
      // Hold the veil a beat, then let the grid develop in.
      setTimeout(() => setPhase("revealed"), 1200);
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

  // ── locked: the photos sleep under the veil ───────────────────────
  if (phase === "locked") {
    return (
      <main className="flex min-h-dvh flex-col">
        <div className="relative h-[26dvh] min-h-[180px]">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: STYLE_COVER[event.filterPreset] }}
          />
          <div aria-hidden className="veil absolute inset-0" />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg to-transparent"
          />
          <header className="relative flex items-center justify-between px-5 pt-5">
            <span className="font-display text-xl">Kormem</span>
            <LanguageSwitcher />
          </header>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pb-16 pt-6 text-center">
          <p className="text-sm text-ink-2">{event.name}</p>
          <h1 className="font-display mt-3 max-w-[16ch] text-[2.3rem] leading-[1.12]">
            {t("lockedTitle")}
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-2">
            {t("lockedText", { time: formatDateTime(event.revealAt, locale) })}
          </p>
          <div className="mt-12">
            <Countdown target={event.revealAt} />
          </div>
        </div>
      </main>
    );
  }

  // ── unlocking: lifting the veil ───────────────────────────────────
  if (phase === "unlocking") {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: STYLE_COVER[event.filterPreset] }}
        />
        <div aria-hidden className="veil absolute inset-0" />
        <div className="relative">
          <h1 className="font-display text-3xl leading-tight">{t("unlockingTitle")}</h1>
          <div className="mx-auto mt-7 h-px w-44 overflow-hidden rounded bg-ink/15">
            <div className="develop-progress h-full bg-crimson" />
          </div>
        </div>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="text-ink-2">{tc("error")}</p>
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
        <span className="font-display text-xl">Kormem</span>
        <LanguageSwitcher />
      </header>

      <div className="mx-auto max-w-5xl px-5">
        <p className="text-sm text-ink-2">{t("revealedKicker")}</p>
        <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">{event.name}</h1>
        <p className="mt-2 text-sm text-ink-2">{t("photoCount", { count: photos.length })}</p>

        {photos.length === 0 ? (
          <p className="mt-14 text-center text-ink-2">{t("empty")}</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightbox(i)}
                className="develop-in group relative aspect-square overflow-hidden rounded-[10px] bg-surface"
                style={{ ["--dev-delay" as string]: `${Math.min(i, 14) * 70}ms`, minHeight: 0 }}
                aria-label={photo.guestName ?? `photo ${i + 1}`}
              >
                {photo.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.thumbUrl}
                    alt=""
                    loading={i < 12 ? "eager" : "lazy"}
                    className="h-full w-full object-cover transition-transform group-active:scale-95"
                    style={{ filter: filterCss(photo.filter) }}
                  />
                )}
                {photo.mine && (
                  <span className="absolute left-2 top-2 rounded-full bg-dark/55 px-2.5 py-1 text-[0.68rem] font-semibold text-ivory backdrop-blur-sm">
                    {t("mine")}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* lightbox (photo viewing stays dark) */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-dark/95 text-ivory"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between p-4">
            <span className="pl-2 text-sm text-ivory/60">
              {photos[lightbox].guestName ?? ""}
              <span className="numeral ml-3 text-base text-ivory">
                {lightbox + 1} / {photos.length}
              </span>
            </span>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory/10"
              aria-label={tc("close")}
            >
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
                className="max-h-full max-w-full rounded-[10px] object-contain"
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
              className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory/10 disabled:opacity-40"
              aria-label={tc("previous")}
            >
              <ArrowLeft size={18} />
            </button>
            <a
              href={photos[lightbox].url ?? "#"}
              download={`kormem-${photos[lightbox].id}.jpg`}
              className="btn btn-dark !min-h-[50px]"
            >
              <DownloadIcon size={17} /> {t("download")}
            </a>
            <button
              type="button"
              disabled={lightbox >= photos.length - 1}
              onClick={() => setLightbox(lightbox + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory/10 disabled:opacity-40"
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
