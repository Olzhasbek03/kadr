"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { GalleryItem } from "@/lib/types";
import { descriptorFromSelfie, imageMatches } from "@/lib/client/faceMatch";
import { CameraIcon, RedoIcon, XIcon } from "@/components/icons";

type Stage = "starting" | "live" | "denied" | "noface" | "scanning" | "none";

/**
 * "Find my photos": selfie in, matching frames out. All recognition runs
 * on the guest's device; the selfie is never uploaded and is discarded
 * the moment the descriptor is computed.
 */
export default function FindMe({
  items,
  onResult,
  onClose,
}: {
  items: GalleryItem[];
  onResult: (matched: Set<string>) => void;
  onClose: () => void;
}) {
  const t = useTranslations("gallery");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const genRef = useRef(0);
  const cancelledRef = useRef(false);
  const [stage, setStage] = useState<Stage>("starting");
  const [progress, setProgress] = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    const gen = ++genRef.current;
    stopStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setStage("denied");
      return;
    }
    setStage("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 960 } },
      });
      if (gen !== genRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStage("live");
    } catch {
      if (gen === genRef.current) setStage("denied");
    }
  }, [stopStream]);

  useEffect(() => {
    cancelledRef.current = false;
    void start();
    const gen = genRef;
    return () => {
      cancelledRef.current = true;
      gen.current++;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scan = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Freeze the selfie frame; the camera can go dark while we compute.
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    stopStream();
    setStage("scanning");
    setProgress(0);

    try {
      const reference = await descriptorFromSelfie(canvas);
      if (cancelledRef.current) return;
      if (!reference) {
        setStage("noface");
        void start();
        return;
      }
      const matched = new Set<string>();
      let done = 0;
      for (const item of items) {
        if (cancelledRef.current) return;
        const url = item.thumbUrl ?? item.url;
        if (url && (await imageMatches(url, reference))) matched.add(item.id);
        done++;
        setProgress(done);
      }
      if (cancelledRef.current) return;
      if (matched.size === 0) {
        setStage("none");
        return;
      }
      onResult(matched);
    } catch {
      if (!cancelledRef.current) {
        setStage("noface");
        void start();
      }
    }
  }, [items, onResult, start, stopStream]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-dark/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("findMeTitle")}
    >
      <div className="fade-in w-full max-w-sm rounded-[14px] bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[1.35rem] leading-tight">{t("findMeTitle")}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{t("findMeText")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("findMeClose")}
            className="flex !min-h-0 h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-ink/5 hover:text-ink"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="relative mt-4 aspect-square overflow-hidden rounded-[12px] bg-dark">
          {(stage === "starting" || stage === "live" || stage === "noface") && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
            />
          )}
          {stage === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center text-ivory/60">
              <CameraIcon size={24} className="animate-pulse" />
            </div>
          )}
          {stage === "denied" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-ivory">
              <CameraIcon size={24} className="text-ivory/60" />
              <p className="mt-3 text-sm leading-relaxed text-ivory/80">{t("findMeDenied")}</p>
              <button
                type="button"
                onClick={() => void start()}
                className="btn-dark mt-4 !min-h-[44px] text-sm"
              >
                <RedoIcon size={15} /> {t("findMeRetry")}
              </button>
            </div>
          )}
          {stage === "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-ivory">
              <p className="numeral text-3xl" aria-live="polite">
                {progress} / {items.length}
              </p>
              <p className="mt-2 text-sm text-ivory/70">{t("findMeScanning")}</p>
              <div className="mt-5 h-px w-40 overflow-hidden rounded bg-ivory/20">
                <div
                  className="h-full origin-left bg-accent-soft transition-transform duration-300"
                  style={{ transform: `scaleX(${items.length ? progress / items.length : 0})` }}
                />
              </div>
            </div>
          )}
          {stage === "none" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-ivory">
              <p className="text-sm leading-relaxed text-ivory/85">{t("findMeNone")}</p>
              <button
                type="button"
                onClick={() => void start().then(() => setStage("live"))}
                className="btn-dark mt-4 !min-h-[44px] text-sm"
              >
                <RedoIcon size={15} /> {t("findMeRetry")}
              </button>
            </div>
          )}
        </div>

        {stage === "noface" && (
          <p role="status" className="mt-3 text-center text-sm text-danger">
            {t("findMeNoFace")}
          </p>
        )}

        {(stage === "live" || stage === "noface") && (
          <button type="button" onClick={() => void scan()} className="btn-primary mt-4 w-full">
            <CameraIcon size={17} /> {t("findMeShoot")}
          </button>
        )}

        <p className="mt-3 text-center text-xs leading-relaxed text-ink-2">
          {t("findMePrivacy")}
        </p>
      </div>
    </div>
  );
}
