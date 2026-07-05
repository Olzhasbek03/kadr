"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PublicEvent } from "@/lib/types";
import { FILM_STYLES, FILTER_CSS, STYLE_COVER, type FilmStyle } from "@/lib/filters";
import { captureFrame, processFile, type CapturedShot } from "@/lib/client/capture";
import {
  ArrowLeft,
  CameraIcon,
  FilmIcon,
  FlipIcon,
  ImageIcon,
  UploadIcon,
} from "@/components/icons";

type CameraMode = "starting" | "live" | "fallback";

interface PendingUpload {
  shot: CapturedShot;
  filter: FilmStyle;
  tries: number;
}

const MAX_PARALLEL_PENDING = 4;

export default function CameraView({
  event,
  initialShotsLeft,
}: {
  event: PublicEvent;
  initialShotsLeft: number;
}) {
  const t = useTranslations("camera");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<PendingUpload[]>([]);
  const uploadingRef = useRef(false);

  const [mode, setMode] = useState<CameraMode>("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [style, setStyle] = useState<FilmStyle>(event.filterPreset);
  const [shotsLeft, setShotsLeft] = useState(initialShotsLeft);
  const [flash, setFlash] = useState(false);
  const [developing, setDeveloping] = useState(false);
  const [pending, setPending] = useState(0);
  const [uploadError, setUploadError] = useState(false);

  // ── camera lifecycle ──────────────────────────────────────────────

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(
    async (facingMode: "environment" | "user") => {
      stopStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        setMode("fallback");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode, width: { ideal: 2560 }, height: { ideal: 1920 } },
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play().catch(() => {});
        setMode("live");
      } catch {
        // Permission denied or camera busy — graceful path below.
        setMode("fallback");
      }
    },
    [stopStream]
  );

  useEffect(() => {
    void startStream(facing);
    return stopStream;
  }, [facing, startStream, stopStream]);

  // ── upload queue (in-memory, retries with backoff) ────────────────

  const drainQueue = useCallback(async () => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current[0];
        const form = new FormData();
        form.append("original", item.shot.original, "shot.jpg");
        form.append("thumb", item.shot.thumb, "thumb.jpg");
        form.append("filter", item.filter);
        try {
          const res = await fetch(`/api/e/${event.slug}/upload`, {
            method: "POST",
            body: form,
          });
          if (res.status === 403) {
            // Server says no film / closed — trust it, drop the shot.
            const data = await res.json().catch(() => ({}));
            if (typeof data.shotsLeft === "number") setShotsLeft(data.shotsLeft);
            queueRef.current.shift();
          } else if (!res.ok) {
            throw new Error(String(res.status));
          } else {
            queueRef.current.shift();
            setUploadError(false);
          }
        } catch {
          item.tries += 1;
          if (item.tries >= 5) {
            queueRef.current.shift(); // give up on this one
            setUploadError(true);
          } else {
            setUploadError(true);
            await new Promise((r) => setTimeout(r, Math.min(15000, 1500 * item.tries)));
          }
        }
        setPending(queueRef.current.length);
      }
    } finally {
      uploadingRef.current = false;
      setPending(queueRef.current.length);
    }
  }, [event.slug]);

  useEffect(() => {
    const onOnline = () => void drainQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [drainQueue]);

  const enqueue = useCallback(
    (shot: CapturedShot) => {
      queueRef.current.push({ shot, filter: style, tries: 0 });
      setPending(queueRef.current.length);
      void drainQueue();
    },
    [style, drainQueue]
  );

  // ── shooting ──────────────────────────────────────────────────────

  const afterShot = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 110);
    if (navigator.vibrate) navigator.vibrate(18);
    setDeveloping(true);
    setShotsLeft((n) => Math.max(0, n - 1));
    setTimeout(() => setDeveloping(false), 950);
  }, []);

  const shoot = useCallback(async () => {
    const video = videoRef.current;
    if (!video || developing || shotsLeft <= 0) return;
    if (queueRef.current.length >= MAX_PARALLEL_PENDING) return;
    try {
      const shot = await captureFrame(video, facing === "user");
      afterShot();
      enqueue(shot);
    } catch {
      /* frame not ready — shot not consumed */
    }
  }, [developing, shotsLeft, facing, afterShot, enqueue]);

  const shootFromFile = useCallback(
    async (file: File | null) => {
      if (!file || developing || shotsLeft <= 0) return;
      try {
        const shot = await processFile(file);
        afterShot();
        enqueue(shot);
      } catch {
        /* unreadable file */
      }
    },
    [developing, shotsLeft, afterShot, enqueue]
  );

  // ── out of film ───────────────────────────────────────────────────

  if (shotsLeft <= 0 && pending === 0) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-crimson/30 bg-crimson/5 text-crimson">
          <FilmIcon size={30} />
        </span>
        <h1 className="font-display mt-8 text-4xl leading-tight">{t("outOfFilm")}</h1>
        <p className="mt-4 max-w-xs leading-relaxed text-ink-2">
          {t("outOfFilmText", { shots: event.shotsPerGuest })}
        </p>
        <Link href={`/e/${event.slug}/gallery`} className="btn btn-primary mt-9">
          {t("toGallery")}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col bg-dark text-ivory">
      {/* viewfinder */}
      <div className="relative m-2 flex-1 overflow-hidden rounded-[14px] bg-ink">
        {mode !== "fallback" && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`absolute inset-0 h-full w-full object-cover transition-[filter] duration-200 ${
              facing === "user" ? "-scale-x-100" : ""
            }`}
            style={{ filter: FILTER_CSS[style] }}
          />
        )}
        {mode === "fallback" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <CameraIcon size={30} className="text-ivory/60" />
            <p className="mt-5 font-medium">{t("permissionTitle")}</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory/60">{t("permissionText")}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-dark mt-7"
            >
              <ImageIcon size={18} /> {t("useNativeCamera")}
            </button>
            <button
              type="button"
              onClick={() => void startStream(facing)}
              className="mt-4 text-sm text-ivory/60 underline underline-offset-4"
              style={{ minHeight: 44 }}
            >
              {t("retryPermission")}
            </button>
          </div>
        )}

        {mode === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <FilmIcon size={26} className="animate-pulse text-ivory/50" />
          </div>
        )}

        {/* shutter flash */}
        {flash && <div className="absolute inset-0 z-20 bg-white/85" />}

        {/* developing chip */}
        {developing && (
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
            <span className="fade-in flex items-center gap-2.5 rounded-full bg-dark/75 px-4 py-2.5 text-sm text-ivory backdrop-blur-sm">
              <FilmIcon size={15} className="animate-pulse text-rose" />
              {t("developing")}
              <span className="relative h-px w-14 overflow-hidden rounded bg-ivory/25">
                <span className="develop-progress absolute inset-y-0 left-0 bg-rose" />
              </span>
            </span>
          </div>
        )}

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <Link
            href={`/e/${event.slug}`}
            aria-label={t("back")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-dark/60 text-ivory backdrop-blur-sm"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col items-end gap-2">
            <span className="flex items-center gap-2 rounded-full bg-dark/60 px-4 py-2 backdrop-blur-sm">
              <FilmIcon size={15} className="text-rose" />
              <span className="numeral text-lg leading-none">
                {shotsLeft}
                <span className="text-ivory/55"> / {event.shotsPerGuest}</span>
              </span>
            </span>
            {pending > 0 && (
              <span
                className={`flex items-center gap-1.5 rounded-full bg-dark/60 px-3 py-1.5 text-xs backdrop-blur-sm ${
                  uploadError ? "text-rose" : "text-ivory/60"
                }`}
              >
                <UploadIcon size={12} />
                {uploadError ? t("uploadRetry", { count: pending }) : t("uploading", { count: pending })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* film style selector */}
      <div
        className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3"
        role="radiogroup"
        aria-label={t("styles")}
      >
        {FILM_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={style === s}
            onClick={() => setStyle(s)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
              style === s
                ? "border-rose bg-rose/10 text-rose"
                : "border-ivory/15 bg-ivory/5 text-ivory/70"
            }`}
            style={{ minHeight: 44 }}
          >
            <span
              aria-hidden
              className="h-5 w-5 rounded-full border border-ivory/20"
              style={{ background: STYLE_COVER.original, filter: FILTER_CSS[s] }}
            />
            {t(`filterNames.${s}`)}
          </button>
        ))}
      </div>

      {/* controls */}
      <div className="flex items-center justify-around px-8 pb-[max(1.2rem,env(safe-area-inset-bottom))] pt-1.5">
        <span className="h-[52px] w-[52px]" />
        <button
          type="button"
          onClick={() => (mode === "fallback" ? fileInputRef.current?.click() : void shoot())}
          disabled={mode === "starting" || developing || pending >= MAX_PARALLEL_PENDING}
          className="shutter"
          aria-label={t("shutter")}
        >
          <span />
        </button>
        {mode === "live" ? (
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ivory/10 text-ivory"
            aria-label={t("flip")}
          >
            <FlipIcon size={20} />
          </button>
        ) : (
          <span className="h-[52px] w-[52px]" />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void shootFromFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </main>
  );
}
