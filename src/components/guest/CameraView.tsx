"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { GuestAllowance, MediaType, PublicEvent } from "@/lib/types";
import { AUDIO_MAX_SECONDS, VIDEO_MAX_SECONDS } from "@/lib/types";
import { FILTER_CSS, STYLE_COVER, type FilmStyle } from "@/lib/filters";
import { captureFrame, capturePoster, processFile } from "@/lib/client/capture";
import {
  canRecordAudio,
  canRecordVideo,
  recordVideo,
  recordVoice,
  type RecorderHandle,
} from "@/lib/client/recorder";
import {
  enqueue,
  loadPending,
  uploadOne,
  type PendingUpload,
} from "@/lib/client/uploadQueue";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  ArrowLeft,
  CameraIcon,
  FilmIcon,
  FlipIcon,
  ImageIcon,
  MicIcon,
  PlayIcon,
  PauseIcon,
  RedoIcon,
  UploadIcon,
  VideoIcon,
} from "@/components/icons";

type StreamState = "starting" | "live" | "fallback";
type CaptureMode = "photo" | "video" | "voice";
type VoicePhase = "idle" | "recording" | "preview";

const MAX_QUEUE = 6;

function newId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CameraView({
  event,
  initialAllowance,
}: {
  event: PublicEvent;
  initialAllowance: GuestAllowance;
}) {
  const t = useTranslations("camera");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<PendingUpload[]>([]);
  const drainingRef = useRef(false);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelRafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [mode, setMode] = useState<CaptureMode>("photo");
  const [streamState, setStreamState] = useState<StreamState>("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [style, setStyle] = useState<FilmStyle>(event.filterPreset);
  const [allowance, setAllowance] = useState<GuestAllowance>(initialAllowance);
  const [flash, setFlash] = useState(false);
  const [developing, setDeveloping] = useState(false);
  const [pending, setPending] = useState(0);
  const [uploadError, setUploadError] = useState(false);
  const [limitNote, setLimitNote] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceTake, setVoiceTake] = useState<{ blob: Blob; mime: string; durationS: number } | null>(null);
  const [playingPreview, setPlayingPreview] = useState(false);
  const [level, setLevel] = useState(0);

  // MediaRecorder only exists in the browser; probing it during render
  // makes the server and client disagree and breaks hydration.
  const [videoSupported, setVideoSupported] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  useEffect(() => {
    setVideoSupported(canRecordVideo());
    setVoiceSupported(canRecordAudio());
  }, []);
  const maxSeconds = mode === "voice" ? AUDIO_MAX_SECONDS : VIDEO_MAX_SECONDS;

  // ── stream lifecycle (per mode + facing) ──────────────────────────

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(
    async (m: CaptureMode, facingMode: "environment" | "user") => {
      stopStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        setStreamState("fallback");
        return;
      }
      setStreamState("starting");
      try {
        let stream: MediaStream;
        if (m === "voice") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else if (m === "video") {
          // 720p target for recording; mic included. If the mic is denied,
          // fall back to a silent clip rather than no clip at all.
          const constraints = {
            video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          };
          try {
            stream = await navigator.mediaDevices.getUserMedia({ ...constraints, audio: true });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode, width: { ideal: 2560 }, height: { ideal: 1920 } },
          });
        }
        streamRef.current = stream;
        if (m !== "voice") {
          const video = videoRef.current;
          if (!video) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setStreamState("live");
      } catch {
        // Permission denied or device busy — graceful path below.
        setStreamState("fallback");
      }
    },
    [stopStream]
  );

  useEffect(() => {
    void startStream(mode, facing);
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, facing]);

  // ── upload queue (IndexedDB-backed, survives tab death) ───────────

  const applyOutcomeAllowance = useCallback(
    (a?: GuestAllowance) => {
      if (a) setAllowance(a);
    },
    []
  );

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current[0];
        const outcome = await uploadOne(item);
        if (outcome.status === "retrying") {
          setUploadError(true);
          await new Promise((r) => setTimeout(r, Math.min(15000, 1500 * item.tries)));
          continue;
        }
        queueRef.current.shift();
        setPending(queueRef.current.length);
        applyOutcomeAllowance(outcome.allowance);
        if (outcome.status === "uploaded") setUploadError(false);
        if (outcome.status === "dropped") setUploadError(true);
        if (outcome.status === "rejected" && outcome.code) {
          if (outcome.code === "video_cap") setLimitNote(t("videoCapReached"));
          else if (outcome.code === "audio_cap") setLimitNote(t("voiceCapReached"));
        }
      }
    } finally {
      drainingRef.current = false;
      setPending(queueRef.current.length);
    }
  }, [applyOutcomeAllowance, t]);

  // Resume anything a previous visit left behind.
  useEffect(() => {
    let cancelled = false;
    void loadPending(event.slug).then((items) => {
      if (cancelled || items.length === 0) return;
      const known = new Set(queueRef.current.map((i) => i.id));
      for (const item of items) if (!known.has(item.id)) queueRef.current.push(item);
      setPending(queueRef.current.length);
      void drainQueue();
    });
    const onOnline = () => void drainQueue();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [event.slug, drainQueue]);

  const enqueueCapture = useCallback(
    async (
      mediaType: MediaType,
      blob: Blob,
      mime: string,
      thumb: Blob | null,
      durationS: number | null
    ) => {
      const item: PendingUpload = {
        id: newId(),
        slug: event.slug,
        mediaType,
        filter: mediaType === "audio" ? "original" : style,
        durationS,
        blob,
        mime,
        thumb,
        tries: 0,
        createdAt: Date.now(),
      };
      queueRef.current.push(item);
      setPending(queueRef.current.length);
      await enqueue(item); // persist before we try the network
      // Optimistic local decrement; the server response corrects it.
      setAllowance((a) => ({
        shotsLeft: Math.max(0, a.shotsLeft - 1),
        videosLeft: Math.max(0, a.videosLeft - (mediaType === "video" ? 1 : 0)),
        audiosLeft: Math.max(0, a.audiosLeft - (mediaType === "audio" ? 1 : 0)),
      }));
      void drainQueue();
    },
    [event.slug, style, drainQueue]
  );

  // ── photo ─────────────────────────────────────────────────────────

  const afterShot = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 110);
    if (navigator.vibrate) navigator.vibrate(18);
    setDeveloping(true);
    setTimeout(() => setDeveloping(false), 950);
  }, []);

  const shootPhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || developing || allowance.shotsLeft <= 0) return;
    if (queueRef.current.length >= MAX_QUEUE) return;
    try {
      const shot = await captureFrame(video, facing === "user");
      afterShot();
      void enqueueCapture("photo", shot.original, "image/jpeg", shot.thumb, null);
    } catch {
      /* frame not ready — shot not consumed */
    }
  }, [developing, allowance.shotsLeft, facing, afterShot, enqueueCapture]);

  const shootFromFile = useCallback(
    async (file: File | null) => {
      if (!file || developing || allowance.shotsLeft <= 0) return;
      try {
        const shot = await processFile(file);
        afterShot();
        void enqueueCapture("photo", shot.original, "image/jpeg", shot.thumb, null);
      } catch {
        // e.g. a HEIC the browser can't decode (Android picking from gallery)
        setLimitNote(t("fileUnreadable"));
      }
    },
    [developing, allowance.shotsLeft, afterShot, enqueueCapture, t]
  );

  // ── shared recording timer/level plumbing ─────────────────────────

  const startElapsed = useCallback(() => {
    setElapsed(0);
    const startedAt = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.min(maxSeconds, (Date.now() - startedAt) / 1000));
    }, 100);
  }, [maxSeconds]);

  const stopElapsed = useCallback(() => {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
  }, []);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
        levelRafRef.current = requestAnimationFrame(tick);
      };
      levelRafRef.current = requestAnimationFrame(tick);
    } catch {
      /* meter is decoration; recording works without it */
    }
  }, []);

  const stopLevelMeter = useCallback(() => {
    cancelAnimationFrame(levelRafRef.current);
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(
    () => () => {
      stopElapsed();
      stopLevelMeter();
      recorderRef.current?.cancel();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [stopElapsed, stopLevelMeter]
  );

  // ── video clips ───────────────────────────────────────────────────

  const stopVideoRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const startVideoRecording = useCallback(async () => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video || recording) return;
    if (allowance.videosLeft <= 0 || queueRef.current.length >= MAX_QUEUE) return;

    let poster: Blob | null = null;
    try {
      poster = await capturePoster(video, facing === "user");
    } catch {
      /* poster is best-effort */
    }

    const handle = recordVideo(stream, VIDEO_MAX_SECONDS * 1000);
    recorderRef.current = handle;
    setRecording(true);
    startElapsed();
    if (navigator.vibrate) navigator.vibrate(12);

    handle.done
      .then((rec) => {
        void enqueueCapture("video", rec.blob, rec.mime, poster, rec.durationS);
      })
      .catch(() => {})
      .finally(() => {
        recorderRef.current = null;
        setRecording(false);
        stopElapsed();
      });
  }, [recording, allowance.videosLeft, facing, startElapsed, stopElapsed, enqueueCapture]);

  const shootVideoFromFile = useCallback(
    async (file: File | null) => {
      if (!file || allowance.videosLeft <= 0) return;
      // Native camera clips have no 10s cap; the size cap stands in for it.
      if (file.size > 4 * 1024 * 1024) {
        setLimitNote(t("videoTooLarge"));
        return;
      }
      const mime = file.type.startsWith("video/") ? file.type.split(";")[0] : "video/mp4";
      void enqueueCapture("video", file, mime, null, null);
    },
    [allowance.videosLeft, enqueueCapture, t]
  );

  // ── voice wishes ──────────────────────────────────────────────────

  const startVoiceRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recording || allowance.audiosLeft <= 0) return;
    const handle = recordVoice(stream, AUDIO_MAX_SECONDS * 1000);
    recorderRef.current = handle;
    setRecording(true);
    setVoicePhase("recording");
    startElapsed();
    startLevelMeter(stream);

    handle.done
      .then((rec) => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = URL.createObjectURL(rec.blob);
        setVoiceTake(rec);
        setVoicePhase("preview");
      })
      .catch(() => setVoicePhase("idle"))
      .finally(() => {
        recorderRef.current = null;
        setRecording(false);
        stopElapsed();
        stopLevelMeter();
      });
  }, [recording, allowance.audiosLeft, startElapsed, stopElapsed, startLevelMeter, stopLevelMeter]);

  const stopVoiceRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const discardVoiceTake = useCallback(() => {
    previewAudioRef.current?.pause();
    setPlayingPreview(false);
    setVoiceTake(null);
    setVoicePhase("idle");
  }, []);

  const sendVoiceTake = useCallback(() => {
    if (!voiceTake) return;
    void enqueueCapture("audio", voiceTake.blob, voiceTake.mime, null, voiceTake.durationS);
    previewAudioRef.current?.pause();
    setPlayingPreview(false);
    setVoiceTake(null);
    setVoicePhase("idle");
  }, [voiceTake, enqueueCapture]);

  const togglePreviewPlayback = useCallback(() => {
    const el = previewAudioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlayingPreview(true);
    } else {
      el.pause();
      setPlayingPreview(false);
    }
  }, []);

  // Auto-dismiss limit notes.
  useEffect(() => {
    if (!limitNote) return;
    const id = setTimeout(() => setLimitNote(null), 4000);
    return () => clearTimeout(id);
  }, [limitNote]);

  // ── out of film ───────────────────────────────────────────────────

  if (allowance.shotsLeft <= 0 && pending === 0 && voicePhase !== "preview") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-accent/5 text-accent">
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

  const modeDisabled = (m: CaptureMode) =>
    (m === "video" && (!videoSupported || allowance.videosLeft <= 0)) ||
    (m === "voice" && (!voiceSupported || allowance.audiosLeft <= 0));

  const switchMode = (m: CaptureMode) => {
    if (recording || m === mode) return;
    discardVoiceTake();
    setMode(m);
  };

  const modes: { id: CaptureMode; icon: React.ReactNode; label: string }[] = [
    { id: "photo", icon: <CameraIcon size={16} />, label: t("modePhoto") },
    { id: "video", icon: <VideoIcon size={16} />, label: t("modeVideo") },
    { id: "voice", icon: <MicIcon size={16} />, label: t("modeVoice") },
  ];

  const progress = Math.min(1, elapsed / maxSeconds);

  return (
    <main className="flex h-dvh flex-col bg-dark text-ivory">
      {/* viewfinder / voice stage */}
      <div className="relative m-2 flex-1 overflow-hidden rounded-[14px] bg-ink">
        {mode !== "voice" && streamState !== "fallback" && (
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

        {/* voice stage */}
        {mode === "voice" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
            style={{ background: STYLE_COVER[event.filterPreset], color: "var(--ink)" }}
          >
            {voicePhase !== "preview" ? (
              <>
                <p className="max-w-xs text-lg font-medium leading-snug">
                  {t("voicePrompt", { event: event.name })}
                </p>
                {/* live level bars */}
                <div className="mt-10 flex h-16 items-center gap-1.5" aria-hidden>
                  {Array.from({ length: 24 }, (_, i) => {
                    const wave = recording
                      ? 0.25 + level * (0.4 + 0.6 * Math.abs(Math.sin((i / 24) * Math.PI * 2.5)))
                      : 0.12;
                    return (
                      <span
                        key={i}
                        className="h-16 w-1 origin-center rounded-full bg-accent transition-transform duration-100"
                        style={{
                          transform: `scaleY(${Math.max(0.09, wave)})`,
                          opacity: recording ? 0.9 : 0.35,
                        }}
                      />
                    );
                  })}
                </div>
                <p className="numeral mt-6 text-2xl" aria-live="polite">
                  {recording
                    ? t("timer", { elapsed: Math.floor(elapsed), max: AUDIO_MAX_SECONDS })
                    : t("voiceUpTo", { seconds: AUDIO_MAX_SECONDS })}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">{t("voiceListenBack")}</p>
                <audio
                  ref={previewAudioRef}
                  src={previewUrlRef.current ?? undefined}
                  onEnded={() => setPlayingPreview(false)}
                  className="hidden"
                />
                <div className="mt-8 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={togglePreviewPlayback}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-ivory"
                    aria-label={playingPreview ? t("voicePause") : t("voicePlay")}
                  >
                    {playingPreview ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
                  </button>
                </div>
                <p className="numeral mt-4 text-lg">{Math.round(voiceTake?.durationS ?? 0)}s</p>
                <div className="mt-8 flex items-center gap-3">
                  <button type="button" onClick={discardVoiceTake} className="btn-secondary">
                    <RedoIcon size={17} /> {t("voiceRedo")}
                  </button>
                  <button type="button" onClick={sendVoiceTake} className="btn-primary">
                    <UploadIcon size={17} /> {t("voiceSend")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* permission fallback (photo/video modes) */}
        {mode !== "voice" && streamState === "fallback" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            {mode === "photo" ? <CameraIcon size={30} className="text-ivory/60" /> : <VideoIcon size={30} className="text-ivory/60" />}
            <p className="mt-5 font-medium">{t("permissionTitle")}</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory/60">{t("permissionText")}</p>
            <button
              type="button"
              onClick={() =>
                (mode === "photo" ? fileInputRef : videoFileInputRef).current?.click()
              }
              className="btn-dark mt-7"
            >
              <ImageIcon size={18} /> {t("useNativeCamera")}
            </button>
            <button
              type="button"
              onClick={() => void startStream(mode, facing)}
              className="mt-4 text-sm text-ivory/60 underline underline-offset-4"
              style={{ minHeight: 44 }}
            >
              {t("retryPermission")}
            </button>
          </div>
        )}

        {/* voice permission fallback */}
        {mode === "voice" && streamState === "fallback" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink px-8 text-center">
            <MicIcon size={30} className="text-ivory/60" />
            <p className="mt-5 font-medium">{t("micPermissionTitle")}</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory/60">{t("micPermissionText")}</p>
            <button
              type="button"
              onClick={() => void startStream(mode, facing)}
              className="btn-dark mt-7"
            >
              {t("retryPermission")}
            </button>
          </div>
        )}

        {streamState === "starting" && (
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
              <FilmIcon size={15} className="animate-pulse text-accent-soft" />
              {t("developing")}
              <span className="relative h-px w-14 overflow-hidden rounded bg-ivory/25">
                <span className="develop-progress absolute inset-y-0 left-0 bg-accent-soft" />
              </span>
            </span>
          </div>
        )}

        {/* recording indicator (video mode) */}
        {mode === "video" && recording && (
          <div className="absolute inset-x-0 top-16 z-10 flex justify-center">
            <span className="flex items-center gap-2.5 rounded-full bg-dark/75 px-4 py-2 text-sm backdrop-blur-sm">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
              <span className="numeral">
                {t("timer", { elapsed: Math.floor(elapsed), max: VIDEO_MAX_SECONDS })}
              </span>
            </span>
          </div>
        )}

        {/* limit note */}
        {limitNote && (
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-6">
            <span role="status" className="fade-in rounded-full bg-dark/80 px-4 py-2.5 text-center text-sm text-ivory backdrop-blur-sm">
              {limitNote}
            </span>
          </div>
        )}

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div className="flex items-center gap-2">
            <Link
              href={`/e/${event.slug}`}
              aria-label={t("back")}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-dark/60 text-ivory backdrop-blur-sm"
            >
              <ArrowLeft size={18} />
            </Link>
            <span className="rounded-full bg-dark/60 px-2 py-1.5 text-ivory backdrop-blur-sm">
              <LanguageSwitcher />
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="flex items-center gap-2 rounded-full bg-dark/60 px-4 py-2 backdrop-blur-sm">
              <FilmIcon size={15} className="text-accent-soft" />
              <span className="numeral text-lg leading-none">
                {allowance.shotsLeft}
                <span className="text-ivory/55"> / {event.shotsPerGuest}</span>
              </span>
            </span>
            {pending > 0 && (
              <span
                className={`flex items-center gap-1.5 rounded-full bg-dark/60 px-3 py-1.5 text-xs backdrop-blur-sm ${
                  uploadError ? "text-accent-soft" : "text-ivory/60"
                }`}
              >
                <UploadIcon size={12} />
                {uploadError ? t("uploadRetry", { count: pending }) : t("uploading", { count: pending })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* film style selector (photo + video), limited to the host's list */}
      {mode !== "voice" && event.allowedStyles.length > 1 ? (
        <div
          className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3"
          role="radiogroup"
          aria-label={t("styles")}
        >
          {event.allowedStyles.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={style === s}
              onClick={() => setStyle(s)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                style === s
                  ? "border-accent-soft bg-accent-soft/10 text-accent-soft"
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
      ) : mode === "voice" ? (
        <div className="px-4 py-3 text-center text-xs text-ivory/50">
          {allowance.audiosLeft > 0
            ? t("voiceHint")
            : t("voiceCapReached")}
        </div>
      ) : (
        <div className="py-1.5" />
      )}

      {/* mode switcher */}
      <div className="flex justify-center gap-1.5 px-4 pb-1" role="group" aria-label={t("modes")}>
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            disabled={modeDisabled(m.id) || recording}
            onClick={() => switchMode(m.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-35 ${
              mode === m.id ? "bg-ivory/15 text-ivory" : "text-ivory/55"
            }`}
            style={{ minHeight: 40 }}
          >
            {m.icon}
            {m.label}
            {m.id === "video" && allowance.videosLeft > 0 && mode !== "video" && (
              <span className="numeral text-xs text-ivory/45">{allowance.videosLeft}</span>
            )}
          </button>
        ))}
      </div>

      {/* controls */}
      <div className="flex items-center justify-around px-8 pb-[max(1.2rem,env(safe-area-inset-bottom))] pt-1.5">
        <span className="h-[52px] w-[52px]" />

        {mode === "photo" && (
          <button
            type="button"
            onClick={() =>
              streamState === "fallback" ? fileInputRef.current?.click() : void shootPhoto()
            }
            disabled={streamState === "starting" || developing || pending >= MAX_QUEUE}
            className="shutter"
            aria-label={t("shutter")}
          >
            <span />
          </button>
        )}

        {mode === "video" && (
          <button
            type="button"
            onClick={() =>
              streamState === "fallback"
                ? videoFileInputRef.current?.click()
                : recording
                  ? stopVideoRecording()
                  : void startVideoRecording()
            }
            disabled={streamState === "starting" || pending >= MAX_QUEUE || allowance.videosLeft <= 0}
            className={`shutter ${recording ? "shutter-rec" : ""}`}
            aria-label={recording ? t("stopRecording") : t("startRecording")}
            style={
              recording
                ? {
                    background: `conic-gradient(var(--danger) ${progress * 360}deg, color-mix(in oklab, var(--ivory) 25%, transparent) 0deg)`,
                  }
                : undefined
            }
          >
            <span className={recording ? "!rounded-[6px] !bg-danger !scale-50" : "!bg-danger"} />
          </button>
        )}

        {mode === "voice" && voicePhase !== "preview" && (
          <button
            type="button"
            onClick={() => (recording ? stopVoiceRecording() : startVoiceRecording())}
            disabled={streamState !== "live" || allowance.audiosLeft <= 0}
            className="shutter"
            aria-label={recording ? t("stopRecording") : t("startRecording")}
            style={
              recording
                ? {
                    background: `conic-gradient(var(--accent) ${progress * 360}deg, color-mix(in oklab, var(--ivory) 25%, transparent) 0deg)`,
                  }
                : undefined
            }
          >
            {recording ? (
              <span className="!rounded-[6px] !bg-accent !scale-50" />
            ) : (
              <span className="!bg-accent flex items-center justify-center text-ivory">
                <MicIcon size={26} />
              </span>
            )}
          </button>
        )}
        {mode === "voice" && voicePhase === "preview" && <span className="h-[84px] w-[84px]" />}

        {mode !== "voice" && streamState === "live" ? (
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            disabled={recording}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ivory/10 text-ivory disabled:opacity-35"
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
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void shootVideoFromFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </main>
  );
}
