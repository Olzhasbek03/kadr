"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GalleryItem, PublicEvent } from "@/lib/types";
import { STYLE_COVER } from "@/lib/filters";
import { formatDateTime } from "@/lib/format";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Countdown from "@/components/dashboard/Countdown";
import MediaTile from "@/components/media/MediaTile";
import MediaLightbox from "@/components/media/MediaLightbox";
import AudioWishCard from "@/components/media/AudioWishCard";
import Slideshow from "@/components/media/Slideshow";
import FindMe from "@/components/guest/FindMe";
import AddToHomeScreen from "@/components/guest/AddToHomeScreen";
import {
  CameraIcon,
  FilmIcon,
  PlayIcon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from "@/components/icons";

type Filter = "all" | "photo" | "video" | "mine";

type Phase = "locked" | "unlocking" | "revealed" | "error";

/**
 * The reveal is the product's signature moment: locked (the media sleeps
 * under a veil) → the veil lifts → the gallery develops in. The server
 * enforces the gate; before reveal the API returns 403, so this screen
 * can't leak anything even if the device clock lies.
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
  const [media, setMedia] = useState<GalleryItem[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slideshowFrom, setSlideshowFrom] = useState<number | null>(null);
  const [findMeOpen, setFindMeOpen] = useState(false);
  const [matchedIds, setMatchedIds] = useState<Set<string> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [newest, setNewest] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/e/${event.slug}/gallery`);
      if (res.status === 403) {
        setPhase("locked"); // the server says not yet; respect it
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setMedia(data.media);
      // Hold the veil a beat, then let the grid develop in.
      setTimeout(() => setPhase("revealed"), 1200);
    } catch {
      setPhase("error");
    }
  }, [event.slug]);

  useEffect(() => {
    if (phase === "unlocking") void load();
  }, [phase, load]);

  // Live gallery: while the event is still going, new captures appear on
  // their own. Poll and append only items we don't already have, so tiles
  // and their signed URLs never churn (and a playing video is not cut off).
  useEffect(() => {
    if (phase !== "revealed") return;
    if (Date.now() > new Date(event.endTime).getTime() + 60 * 60 * 1000) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/e/${event.slug}/gallery`);
        if (!res.ok) return;
        const data = await res.json();
        if (stopped) return;
        setMedia((prev) => {
          const known = new Set(prev.map((m) => m.id));
          const fresh = (data.media as GalleryItem[]).filter((m) => !known.has(m.id));
          if (!fresh.length) return prev;
          // Count only others' new shots as "new" worth surfacing.
          setNewCount((n) => n + fresh.filter((m) => !m.mine).length);
          return [...prev, ...fresh];
        });
      } catch {
        /* transient; the next tick tries again */
      }
    };
    const id = setInterval(poll, 20_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [phase, event.slug, event.endTime]);

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

  const isLive = Date.now() <= new Date(event.endTime).getTime() + 60 * 60 * 1000;
  const wishes = useMemo(() => media.filter((m) => m.type === "audio"), [media]);
  const visual = useMemo(() => media.filter((m) => m.type !== "audio"), [media]);
  const hasVideo = useMemo(() => visual.some((m) => m.type === "video"), [visual]);
  const hasMine = useMemo(() => visual.some((m) => m.mine), [visual]);

  // One derived list drives the grid, lightbox and slideshow, so their
  // indices always agree: face-match narrows it, the filter chip narrows
  // it again, then sort orders it (newest-first is the live default).
  const shown = useMemo(() => {
    let list = matchedIds ? visual.filter((m) => matchedIds.has(m.id)) : visual;
    if (filter === "photo") list = list.filter((m) => m.type === "photo");
    else if (filter === "video") list = list.filter((m) => m.type === "video");
    else if (filter === "mine") list = list.filter((m) => m.mine);
    // media is held oldest-first; reverse a copy for newest-first display.
    return newest ? [...list].reverse() : list;
  }, [visual, matchedIds, filter, newest]);

  // The slideshow is photos-only (videos break the ambient rhythm).
  const photoItems = useMemo(() => shown.filter((m) => m.type === "photo"), [shown]);

  // ── locked: the media sleeps under the veil ───────────────────────
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
            <div className="develop-progress h-full bg-accent" />
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                {t("liveKicker")}
              </span>
            ) : (
              <p className="text-sm text-ink-2">{t("revealedKicker")}</p>
            )}
            <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">{event.name}</h1>
            <p className="mt-2 text-sm text-ink-2">{t("mediaCount", { count: media.length })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {photoItems.length > 0 && (
              <button
                type="button"
                onClick={() => setSlideshowFrom(0)}
                className="btn-primary !min-h-[50px]"
              >
                <PlayIcon size={16} /> {t("slideshow")}
              </button>
            )}
            {visual.length > 0 && (
              <button
                type="button"
                onClick={() => setFindMeOpen(true)}
                className="btn-secondary !min-h-[50px]"
              >
                <UsersIcon size={17} /> {t("findMe")}
              </button>
            )}
            {media.length > 0 && (
              <a
                href={`/api/e/${event.slug}/download`}
                className="btn btn-secondary !min-h-[50px]"
              >
                {t("downloadAll")}
              </a>
            )}
          </div>
        </div>

        {matchedIds && (
          <div className="fade-in mt-6 flex flex-wrap items-center gap-3">
            <span className="chip !border-accent !text-ink">
              <UsersIcon size={14} /> {t("findMeMatches", { count: shown.length })}
            </span>
            <button
              type="button"
              onClick={() => setMatchedIds(null)}
              className="flex items-center gap-1.5 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
              style={{ minHeight: 44 }}
            >
              <XIcon size={13} /> {t("findMeShowAll")}
            </button>
          </div>
        )}

        {media.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line text-accent">
              <CameraIcon size={26} />
            </span>
            <p className="font-display mt-6 text-2xl">{t("emptyTitle")}</p>
            <p className="mt-3 max-w-xs leading-relaxed text-ink-2">
              {isLive ? t("emptyLive") : t("empty")}
            </p>
          </div>
        ) : (
          <>
            {wishes.length > 0 && !matchedIds && filter === "all" && (
              <section className="mt-8">
                <p className="label-soft">{t("voiceWishes")}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {wishes.map((item) => (
                    <AudioWishCard
                      key={item.id}
                      item={item}
                      accentLabel={item.mine ? t("mine") : null}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* filter + sort bar */}
            {visual.length > 0 && !matchedIds && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <div
                  className="scrollbar-none flex gap-2 overflow-x-auto"
                  role="tablist"
                  aria-label={t("filterLabel")}
                >
                  {(
                    [
                      ["all", t("filterAll"), null],
                      ["photo", t("filterPhotos"), <CameraIcon key="p" size={14} />],
                      ...(hasVideo
                        ? [["video", t("filterVideos"), <VideoIcon key="v" size={14} />] as const]
                        : []),
                      ...(hasMine
                        ? [["mine", t("filterMine"), <UsersIcon key="m" size={14} />] as const]
                        : []),
                    ] as [Filter, string, React.ReactNode][]
                  ).map(([id, label, icon]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={filter === id}
                      onClick={() => {
                        setFilter(id);
                        setLightbox(null);
                      }}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                        filter === id
                          ? "border-accent bg-accent/5 text-ink"
                          : "border-line text-ink-2 hover:border-line-strong"
                      }`}
                      style={{ minHeight: 40 }}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewest((v) => !v);
                    setLightbox(null);
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-medium text-ink-2 transition-colors hover:border-line-strong"
                  style={{ minHeight: 40 }}
                >
                  <FilmIcon size={14} /> {newest ? t("sortNewest") : t("sortOldest")}
                </button>
              </div>
            )}

            {shown.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {shown.map((item, i) => (
                  <MediaTile
                    key={item.id}
                    item={item}
                    index={i}
                    mineLabel={item.mine ? t("mine") : null}
                    onOpen={() => setLightbox(i)}
                    eager={i < 12}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-12 text-center text-ink-2">{t("noneInFilter")}</p>
            )}
          </>
        )}

      </div>

      {/* keep the event reachable: add it to the home screen */}
      <AddToHomeScreen slug={event.slug} />

      {/* live "new shots" pill: the poll found others' captures */}
      {isLive && newCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setNewCount(0);
            setNewest(true);
            setFilter("all");
            setMatchedIds(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-ivory shadow-lg"
        >
          {t("newShots", { count: newCount })}
        </button>
      )}

      {lightbox !== null && shown[lightbox] && (
        <MediaLightbox
          items={shown}
          index={lightbox}
          onNavigate={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}

      {findMeOpen && (
        <FindMe
          items={visual}
          onResult={(matched) => {
            setMatchedIds(matched);
            setFindMeOpen(false);
            setLightbox(null);
          }}
          onClose={() => setFindMeOpen(false)}
        />
      )}

      {slideshowFrom !== null && photoItems.length > 0 && (
        <Slideshow
          items={photoItems}
          startIndex={slideshowFrom}
          onClose={() => setSlideshowFrom(null)}
        />
      )}
    </main>
  );
}
