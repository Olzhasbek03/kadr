"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FILM_STYLES, FILTER_CSS, type FilmStyle } from "@/lib/filters";
import {
  canRecordAudio,
  canRecordVideo,
  recordVideo,
  recordVoice,
  type RecorderHandle,
} from "@/lib/client/recorder";
import {
  ArrowRight,
  CameraIcon,
  FlipIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  RedoIcon,
  VideoIcon,
} from "@/components/icons";

type Stage = "starting" | "live" | "denied" | "result";
type Mode = "photo" | "video" | "voice";
type Facing = "user" | "environment";

const DEMO_VIDEO_MAX_S = 10;
const DEMO_VOICE_MAX_S = 15;

interface DemoResult {
  mode: Mode;
  url: string;
  /** Front-camera clips play back mirrored, matching the preview. */
  mirrored: boolean;
}

/**
 * The scan-me demo: the real guest camera, one-to-one. Photo, clip and
 * voice modes, front/back switch, live film styles. Nothing is uploaded;
 * every take stays on the device.
 */
export default function TryCamera() {
  const t = useTranslations("try");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Bumped on every start()/unmount; a getUserMedia that resolves after its
  // generation passed is stale and must be stopped, not adopted, or the
  // orphaned stream keeps the camera light on with no way to turn it off.
  const startGenRef = useRef(0);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const playbackRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const [mode, setMode] = useState<Mode>("photo");
  const [facing, setFacing] = useState<Facing>("user");
  const [stage, setStage] = useState<Stage>("starting");
  const [style, setStyle] = useState<FilmStyle>("polaroid");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  // MediaRecorder only exists in the browser; probing it during render
  // makes the server and client disagree and breaks hydration.
  const [videoSupported, setVideoSupported] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    setVideoSupported(canRecordVideo());
    setVoiceSupported(canRecordAudio());
  }, []);
  const maxSeconds = mode === "voice" ? DEMO_VOICE_MAX_S : DEMO_VIDEO_MAX_S;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearResult = useCallback(() => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
    setPlaying(false);
  }, []);

  const start = useCallback(
    async (m: Mode, f: Facing) => {
      const gen = ++startGenRef.current;
      stopStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        setStage("denied");
        return;
      }
      setStage("starting");
      try {
        let stream: MediaStream;
        if (m === "voice") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else if (m === "video") {
          const constraints = {
            video: { facingMode: f, width: { ideal: 1280 }, height: { ideal: 720 } },
          };
          try {
            stream = await navigator.mediaDevices.getUserMedia({ ...constraints, audio: true });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: f, width: { ideal: 1280 } },
          });
        }
        // A newer start() (mode/facing switch, retry tap, unmount) has taken
        // over while the permission prompt was open: discard, don't adopt.
        if (gen !== startGenRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (m !== "voice") {
          const video = videoRef.current;
          if (!video) {
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            return;
          }
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setStage("live");
      } catch {
        if (gen === startGenRef.current) setStage("denied");
      }
    },
    [stopStream]
  );

  useEffect(() => {
    void start(mode, facing);
    const gen = startGenRef;
    return () => {
      gen.current++;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, facing]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancel();
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    []
  );

  const startElapsed = useCallback(() => {
    setElapsed(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.min(maxSeconds, (Date.now() - startedAt) / 1000));
    }, 100);
  }, [maxSeconds]);

  const stopElapsed = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const finish = useCallback(
    (m: Mode, blob: Blob, mirrored: boolean) => {
      clearResult();
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ mode: m, url, mirrored });
      setStage("result");
      stopStream();
    },
    [clearResult, stopStream]
  );

  const shootPhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facing === "user") {
      // Mirror, like the preview the visitor was looking at.
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        // The mirror is baked into the pixels above; play back as-is.
        if (blob) finish("photo", blob, false);
      },
      "image/jpeg",
      0.85
    );
  }, [facing, finish]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recording) return;
    const handle =
      mode === "voice"
        ? recordVoice(stream, DEMO_VOICE_MAX_S * 1000)
        : recordVideo(stream, DEMO_VIDEO_MAX_S * 1000);
    recorderRef.current = handle;
    setRecording(true);
    startElapsed();
    // Recorded frames are raw (unmirrored); mirror front-camera playback so
    // it matches the preview the visitor just saw.
    const mirrored = mode === "video" && facing === "user";
    handle.done
      .then((rec) => finish(mode, rec.blob, mirrored))
      .catch(() => {})
      .finally(() => {
        recorderRef.current = null;
        setRecording(false);
        stopElapsed();
      });
  }, [mode, facing, recording, startElapsed, stopElapsed, finish]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const tryAgain = useCallback(() => {
    clearResult();
    void start(mode, facing);
  }, [clearResult, start, mode, facing]);

  const switchMode = (m: Mode) => {
    if (recording || m === mode) return;
    clearResult();
    setMode(m);
  };

  const togglePlayback = useCallback(() => {
    const el = playbackRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  const modes: { id: Mode; icon: React.ReactNode; label: string; enabled: boolean }[] = [
    { id: "photo", icon: <CameraIcon size={15} />, label: t("modePhoto"), enabled: true },
    { id: "video", icon: <VideoIcon size={15} />, label: t("modeVideo"), enabled: videoSupported },
    { id: "voice", icon: <MicIcon size={15} />, label: t("modeVoice"), enabled: voiceSupported },
  ];

  const progress = Math.min(1, elapsed / maxSeconds);
  const showViewfinder = mode !== "voice" && stage !== "denied" && stage !== "result";

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pb-14">
      <header className="flex w-full max-w-md items-center justify-between py-5">
        <Link href="/" className="font-display text-xl">
          Kormem
        </Link>
        <span className="mono-badge uppercase tracking-[0.25em]">{t("kicker")}</span>
      </header>

      <div className="w-full max-w-md">
        <h1 className="font-display text-center text-[2rem] leading-tight">{t("title")}</h1>
        <p className="mt-2 text-center text-sm leading-[1.5] text-ink-2">{t("subtitle")}</p>

        {/* the stage: a pocket version of the real camera */}
        <div className="mx-auto mt-7 max-w-sm overflow-hidden rounded-[14px] bg-dark">
          <div className="relative aspect-[3/4]">
            {showViewfinder && (
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
            {mode === "voice" && stage !== "denied" && stage !== "result" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-ivory">
                <span
                  className={`flex h-20 w-20 items-center justify-center rounded-full border ${
                    recording ? "animate-pulse border-accent-soft text-accent-soft" : "border-ivory/30 text-ivory/70"
                  }`}
                >
                  <MicIcon size={30} />
                </span>
                <p className="numeral mt-6 text-2xl" aria-live="polite">
                  {recording
                    ? t("timer", { elapsed: Math.floor(elapsed), max: DEMO_VOICE_MAX_S })
                    : t("voiceHint", { seconds: DEMO_VOICE_MAX_S })}
                </p>
              </div>
            )}

            {/* playback */}
            {stage === "result" && result && (
              <>
                {result.mode === "photo" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.url}
                    alt=""
                    className="develop-in absolute inset-0 h-full w-full object-cover"
                    style={{ filter: FILTER_CSS[style] }}
                  />
                )}
                {result.mode === "video" && (
                  <>
                    <video
                      ref={(el) => {
                        playbackRef.current = el;
                      }}
                      src={result.url}
                      playsInline
                      onEnded={() => setPlaying(false)}
                      className={`absolute inset-0 h-full w-full object-cover ${
                        result.mirrored ? "-scale-x-100" : ""
                      }`}
                      style={{ filter: FILTER_CSS[style] }}
                    />
                    <button
                      type="button"
                      onClick={togglePlayback}
                      aria-label={playing ? t("pause") : t("play")}
                      className="absolute inset-0 z-10 flex items-center justify-center"
                    >
                      {!playing && (
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-dark/60 text-ivory backdrop-blur-sm">
                          <PlayIcon size={26} />
                        </span>
                      )}
                    </button>
                  </>
                )}
                {result.mode === "voice" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-ivory">
                    <audio
                      ref={(el) => {
                        playbackRef.current = el;
                      }}
                      src={result.url}
                      onEnded={() => setPlaying(false)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={togglePlayback}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-dark"
                      aria-label={playing ? t("pause") : t("play")}
                    >
                      {playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
                    </button>
                    <p className="mt-4 text-sm text-ivory/70">{t("voiceListen")}</p>
                  </div>
                )}
              </>
            )}

            {stage === "starting" && (
              <div className="absolute inset-0 flex items-center justify-center text-ivory/60">
                <CameraIcon size={26} className="animate-pulse" />
              </div>
            )}

            {stage === "denied" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-ivory">
                {mode === "voice" ? (
                  <MicIcon size={26} className="text-ivory/60" />
                ) : (
                  <CameraIcon size={26} className="text-ivory/60" />
                )}
                <p className="mt-4 text-sm leading-relaxed text-ivory/80">
                  {mode === "voice" ? t("micDenied") : t("denied")}
                </p>
                <button
                  type="button"
                  onClick={() => void start(mode, facing)}
                  className="btn-dark mt-5 !min-h-[46px] text-sm"
                >
                  {t("retry")}
                </button>
              </div>
            )}

            {/* recording chip */}
            {recording && mode === "video" && (
              <div className="absolute inset-x-0 top-4 z-10 flex justify-center">
                <span className="flex items-center gap-2 rounded-full bg-dark/75 px-3.5 py-1.5 text-sm text-ivory backdrop-blur-sm">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
                  <span className="numeral">
                    {t("timer", { elapsed: Math.floor(elapsed), max: DEMO_VIDEO_MAX_S })}
                  </span>
                </span>
              </div>
            )}

            {/* flip camera */}
            {showViewfinder && stage === "live" && (
              <button
                type="button"
                onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                disabled={recording}
                aria-label={t("flip")}
                className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-dark/60 text-ivory backdrop-blur-sm disabled:opacity-40"
              >
                <FlipIcon size={19} />
              </button>
            )}
          </div>

          {/* in-stage controls: mode switcher + shutter, like the real camera */}
          {stage !== "result" && (
            <div className="pb-5 pt-1">
              <div className="flex justify-center gap-1.5 px-4 py-2" role="group" aria-label={t("modes")}>
                {modes.map(
                  (m) =>
                    m.enabled && (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={mode === m.id}
                        disabled={recording}
                        onClick={() => switchMode(m.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                          mode === m.id ? "bg-ivory/15 text-ivory" : "text-ivory/55"
                        }`}
                        style={{ minHeight: 38 }}
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    )
                )}
              </div>
              <div className="flex justify-center pt-1">
                {mode === "photo" ? (
                  <button
                    type="button"
                    onClick={shootPhoto}
                    disabled={stage !== "live"}
                    className="shutter !h-[74px] !w-[74px]"
                    aria-label={t("shoot")}
                  >
                    <span className="!h-[58px] !w-[58px]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => (recording ? stopRecording() : startRecording())}
                    disabled={stage !== "live"}
                    className={`shutter !h-[74px] !w-[74px] ${recording ? "shutter-rec" : ""}`}
                    aria-label={recording ? t("stop") : t("record")}
                    style={
                      recording
                        ? {
                            background: `conic-gradient(var(--danger) ${progress * 360}deg, color-mix(in oklab, var(--ivory) 25%, transparent) 0deg)`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className={
                        recording
                          ? "!h-[58px] !w-[58px] !rounded-[6px] !bg-danger !scale-50"
                          : `!h-[58px] !w-[58px] ${mode === "video" ? "!bg-danger" : "!bg-accent-soft"}`
                      }
                    />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* styles (photo + video) */}
        {mode !== "voice" && stage !== "result" && (
          <div className="mt-5 flex justify-center gap-2" role="radiogroup" aria-label={t("styles")}>
            {FILM_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={style === s}
                onClick={() => setStyle(s)}
                className={`rounded-[40px] border px-4 text-sm font-medium transition-colors ${
                  style === s ? "border-accent bg-accent/5 text-ink" : "border-line text-ink-2"
                }`}
                style={{ minHeight: 44 }}
              >
                {t(`style_${s}`)}
              </button>
            ))}
          </div>
        )}

        {/* after the take */}
        {stage === "result" && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <p className="text-center text-sm leading-[1.5] text-ink-2">{t("afterShot")}</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={tryAgain} className="btn-secondary">
                <RedoIcon size={17} /> {t("again")}
              </button>
              <Link href="/dashboard/new" className="btn btn-primary">
                {t("createCta")} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
