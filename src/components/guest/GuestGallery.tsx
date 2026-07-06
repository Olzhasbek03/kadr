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
import FindMe from "@/components/guest/FindMe";
import { UsersIcon, XIcon } from "@/components/icons";

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
  const [findMeOpen, setFindMeOpen] = useState(false);
  const [matchedIds, setMatchedIds] = useState<Set<string> | null>(null);

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

  const wishes = useMemo(() => media.filter((m) => m.type === "audio"), [media]);
  const visual = useMemo(() => media.filter((m) => m.type !== "audio"), [media]);
  // The face filter narrows the same array the grid and lightbox share, so
  // indices always agree.
  const shown = useMemo(
    () => (matchedIds ? visual.filter((m) => matchedIds.has(m.id)) : visual),
    [visual, matchedIds]
  );

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
            <p className="text-sm text-ink-2">{t("revealedKicker")}</p>
            <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">{event.name}</h1>
            <p className="mt-2 text-sm text-ink-2">{t("mediaCount", { count: media.length })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
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
          <p className="mt-14 text-center text-ink-2">{t("empty")}</p>
        ) : (
          <>
            {wishes.length > 0 && (
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

            {shown.length > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
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
            )}
          </>
        )}
      </div>

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
    </main>
  );
}
