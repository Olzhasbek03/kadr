"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FILM_STYLES, FILTER_CSS, type FilmStyle } from "@/lib/filters";
import { ArrowRight, CameraIcon, RedoIcon } from "@/components/icons";

type Stage = "starting" | "live" | "denied" | "shot";

/**
 * The scan-me demo: a real browser camera, instantly. Nothing is uploaded
 * anywhere; the shot stays on the device and exists only to prove the
 * "no download" promise the QR code makes.
 */
export default function TryCamera() {
  const t = useTranslations("try");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<Stage>("starting");
  const [style, setStyle] = useState<FilmStyle>("polaroid");
  const [shotUrl, setShotUrl] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stopStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setStage("denied");
      return;
    }
    setStage("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStage("live");
    } catch {
      setStage("denied");
    }
  }, [stopStream]);

  useEffect(() => {
    void start();
    return () => {
      stopStream();
      if (shotUrl) URL.revokeObjectURL(shotUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shoot = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    // Mirror, like the preview the visitor was looking at.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (shotUrl) URL.revokeObjectURL(shotUrl);
      setShotUrl(URL.createObjectURL(blob));
      setStage("shot");
      stopStream();
    }, "image/jpeg", 0.85);
  }, [shotUrl, stopStream]);

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pb-14">
      <header className="flex w-full max-w-md items-center justify-between py-5">
        <Link href="/" className="font-display text-xl">
          Kormem
        </Link>
        <span className="mono-badge uppercase tracking-[0.25em]">{t("kicker")}</span>
      </header>

      <div className="w-full max-w-md">
        <h1 className="font-display text-center text-[1.8rem]">{t("title")}</h1>
        <p className="mt-2 text-center text-sm leading-[1.5] text-ink-2">{t("subtitle")}</p>

        {/* the polaroid frame */}
        <div className="card mx-auto mt-7 max-w-sm p-3 pb-14">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[8px] bg-dark">
            {stage !== "shot" && stage !== "denied" && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full -scale-x-100 object-cover transition-[filter] duration-200"
                style={{ filter: FILTER_CSS[style] }}
              />
            )}
            {stage === "shot" && shotUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shotUrl}
                alt=""
                className="develop-in absolute inset-0 h-full w-full object-cover"
                style={{ filter: FILTER_CSS[style] }}
              />
            )}
            {stage === "starting" && (
              <div className="absolute inset-0 flex items-center justify-center text-ivory/60">
                <CameraIcon size={26} className="animate-pulse" />
              </div>
            )}
            {stage === "denied" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-ivory">
                <CameraIcon size={26} className="text-ivory/60" />
                <p className="mt-4 text-sm leading-relaxed text-ivory/80">{t("denied")}</p>
                <button type="button" onClick={() => void start()} className="btn-dark mt-5 !min-h-[46px] text-sm">
                  {t("retry")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* styles */}
        <div className="mt-6 flex justify-center gap-2" role="radiogroup" aria-label={t("styles")}>
          {FILM_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={style === s}
              onClick={() => setStyle(s)}
              className={`rounded-[40px] border px-4 text-sm font-medium transition-colors ${
                style === s
                  ? "border-accent bg-accent/5 text-ink"
                  : "border-line text-ink-2"
              }`}
              style={{ minHeight: 44 }}
            >
              {t(`style_${s}`)}
            </button>
          ))}
        </div>

        {/* action */}
        <div className="mt-7 flex flex-col items-center gap-4">
          {stage === "shot" ? (
            <>
              <p className="text-center text-sm leading-[1.5] text-ink-2">{t("afterShot")}</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => void start()} className="btn-secondary">
                  <RedoIcon size={17} /> {t("again")}
                </button>
                <Link href="/dashboard/new" className="btn btn-primary">
                  {t("createCta")} <ArrowRight size={18} />
                </Link>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={shoot}
              disabled={stage !== "live"}
              className="btn-primary"
            >
              <CameraIcon size={18} /> {t("shoot")}
            </button>
          )}
          <p className="text-center text-xs leading-relaxed text-ink-2">{t("privacyNote")}</p>
        </div>
      </div>
    </main>
  );
}
