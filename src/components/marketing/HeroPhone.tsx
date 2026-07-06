"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CameraIcon, MicIcon, PauseIcon, PlayIcon, VideoIcon } from "@/components/icons";

const SLIDE_MS = 3600;
const SWIPE_LEAD_MS = 640;

/**
 * The hero's proof: a large phone playing the whole guest journey on loop.
 * A ghost thumb swipes, the screen answers: join, then shoot, then the
 * revealed gallery. Pauses off-screen and in hidden tabs; reduced motion
 * gets a plain crossfade with no thumb.
 */
export default function HeroPhone() {
  const t = useTranslations("landing");
  const [index, setIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // visibilitychange must AND with the last intersection state, or a tab
  // switch would resume the loop while the phone is scrolled off-screen.
  const intersectingRef = useRef(true);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        intersectingRef.current = entry.isIntersecting;
        setRunning(entry.isIntersecting && !document.hidden);
      },
      { threshold: 0.25 }
    );
    io.observe(root);
    const onVisibility = () => setRunning(intersectingRef.current && !document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!running || paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const swipeTimer = reduced
      ? null
      : setTimeout(() => setSwiping(true), SLIDE_MS - SWIPE_LEAD_MS);
    const slideTimer = setTimeout(() => {
      setSwiping(false);
      setIndex((i) => (i + 1) % 3);
    }, SLIDE_MS);
    return () => {
      if (swipeTimer) clearTimeout(swipeTimer);
      clearTimeout(slideTimer);
    };
  }, [index, running, paused]);

  const stateFor = (i: number) =>
    i === index ? "active" : i === (index + 2) % 3 ? "exited" : "waiting";

  return (
    <div ref={rootRef} className="phone-frame-lg mx-auto">
      <div className="phone-screen-lg">
        <div className="phone-notch" />

        {/* 01 — the invitation */}
        <div className="hero-slide" data-state={stateFor(0)} aria-hidden={index !== 0}>
          <div className="relative h-[42%] w-full overflow-hidden">
            <Image
              src="/photos/ceremony-lights.jpg"
              alt=""
              fill
              sizes="330px"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent" />
          </div>
          <div className="flex flex-col items-center px-5 pt-3 text-center">
            <p className="text-[11px] text-ink-2">{t("phoneJoinKicker")}</p>
            <p className="font-display mt-1.5 text-[21px] leading-tight">
              {t("phoneEventName")}
            </p>
            <div className="mt-5 w-full rounded-[4px] border border-line bg-surface px-3 py-2.5 text-left text-[12px] text-ink-2">
              {t("phoneNameField")}
            </div>
            <div className="mt-2.5 w-full rounded-[40px] border border-[#171615] bg-[#d6d5d4] px-3 py-2.5 text-center text-[12px] font-medium text-[#171615]">
              {t("phoneOpenCamera")}
            </div>
            <p className="mt-3.5 text-[10px] leading-relaxed text-ink-2">{t("phoneNoApp")}</p>
          </div>
        </div>

        {/* 02 — the camera */}
        <div
          className="hero-slide !bg-dark"
          data-state={stateFor(1)}
          aria-hidden={index !== 1}
          style={{ background: "var(--dark)" }}
        >
          <div className="relative m-2 h-[64%] overflow-hidden rounded-[24px]">
            <Image
              src="/photos/kyz-dance.jpg"
              alt=""
              fill
              sizes="330px"
              className="object-cover"
              style={{ filter: "sepia(0.28) saturate(1.35) contrast(1.05)" }}
            />
            <span className="numeral absolute right-3 top-3 rounded-full bg-dark/60 px-2.5 py-1 text-[12px] text-ivory">
              7 / 10
            </span>
          </div>
          <div className="flex justify-center gap-1.5 px-3 py-2">
            {["original", "noir", "polaroid"].map((s, i) => (
              <span
                key={s}
                className={`rounded-full border px-2.5 py-1 text-[10px] ${
                  i === 2 ? "border-accent-soft text-accent-soft" : "border-ivory/20 text-ivory/60"
                }`}
              >
                {t(`phoneStyle${i + 1}`)}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 pt-1.5 text-ivory/70">
            <CameraIcon size={14} />
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ivory/50">
              <span className="h-8 w-8 rounded-full bg-ivory" />
            </span>
            <span className="flex items-center gap-2">
              <VideoIcon size={14} />
              <MicIcon size={14} />
            </span>
          </div>
        </div>

        {/* 03 — the reveal */}
        <div className="hero-slide" data-state={stateFor(2)} aria-hidden={index !== 2}>
          <div className="px-4 pt-10">
            <p className="text-[10px] text-ink-2">{t("phoneRevealKicker")}</p>
            <p className="font-display text-[18px]">{t("phoneEventName")}</p>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 px-4">
            {[
              "/photos/kyz-dance.jpg",
              "/photos/confetti.jpg",
              "/photos/rings-gold.jpg",
              "/photos/chapel.jpg",
            ].map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-[6px]">
                <Image src={src} alt="" fill sizes="150px" className="object-cover" />
                {i === 1 && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-dark/55 text-ivory">
                      <PlayIcon size={13} />
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mx-4 mt-2.5 flex items-center gap-2.5 rounded-[6px] border border-line bg-surface px-2.5 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-ivory">
              <PlayIcon size={11} />
            </span>
            <span className="h-0.5 flex-1 rounded-full bg-line">
              <span className="block h-full w-1/3 rounded-full bg-accent" />
            </span>
            <MicIcon size={12} className="shrink-0 text-accent" />
          </div>
        </div>

        {/* the ghost thumb */}
        {swiping && !paused && (
          <div aria-hidden className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="swipe-dot" />
          </div>
        )}

        {/* WCAG 2.2.2: anything auto-advancing needs a real stop control */}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t("heroDemoPlay") : t("heroDemoPause")}
          className="absolute bottom-3 right-3 z-20 flex !min-h-0 h-9 w-9 items-center justify-center rounded-full bg-dark/45 text-ivory/90 backdrop-blur-sm transition-colors hover:bg-dark/65"
        >
          {paused ? <PlayIcon size={13} /> : <PauseIcon size={13} />}
        </button>
      </div>
    </div>
  );
}
