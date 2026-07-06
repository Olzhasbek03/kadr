"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabaseConfigured } from "@/lib/supabase/env";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft, CheckIcon, GoogleIcon, MailIcon } from "@/components/icons";

const RESEND_COOLDOWN_S = 30;

function LoginForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent">("idle");
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? t("errorGeneric") : null);
  const [cooldown, setCooldown] = useState(0);
  const [misconfigured, setMisconfigured] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Surface a broken deployment loudly instead of a mute button: if the
  // Supabase URL env var is missing or unparseable, no auth call can work.
  useEffect(() => {
    setMisconfigured(!supabaseConfigured());
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_S);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && cooldownTimer.current) clearInterval(cooldownTimer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const sendMagicLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.includes("@") || phase === "sending" || resending || cooldown > 0) return;
    setError(null);
    // Resending from the confirmation card keeps the card mounted (only the
    // button changes state); the first send drives the whole form's phase.
    const fromSentCard = phase === "sent";
    if (fromSentCard) setResending(true);
    else setPhase("sending");
    try {
      const { error: err } = await supabaseBrowser().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl() },
      });
      if (err) {
        console.error("signInWithOtp failed:", err);
        setError(err.message || t("errorGeneric"));
        if (!fromSentCard) setPhase("idle");
      } else {
        setPhase("sent");
        startCooldown();
      }
    } catch (err) {
      console.error("signInWithOtp threw:", err);
      setError(err instanceof Error ? err.message : t("errorGeneric"));
      if (!fromSentCard) setPhase("idle");
    } finally {
      setResending(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const { error: err } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      });
      if (err) {
        console.error("signInWithOAuth failed:", err);
        setError(err.message || t("errorGeneric"));
      }
    } catch (err) {
      console.error("signInWithOAuth threw:", err);
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    }
  };

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_0.9fr]">
      <div className="relative flex flex-col px-6 sm:px-10">
        <header className="relative flex items-center justify-between py-6">
          <Link href="/" className="icon-btn" aria-label={t("backHome")}>
            <ArrowLeft size={20} />
          </Link>
          <LanguageSwitcher />
        </header>

        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-24">
          <p className="rise-in font-display text-center text-xl text-ink-2">Kormem</p>
          <h1
            className="rise-in font-display mt-4 text-center text-[2.7rem] leading-[1.05]"
            style={{ animationDelay: "70ms" }}
          >
            {t("title")}
          </h1>
          <p
            className="rise-in mt-4 text-center leading-[1.5] text-ink-2"
            style={{ animationDelay: "140ms" }}
          >
            {t("subtitle")}
          </p>

          {misconfigured && (
            <div
              role="alert"
              className="mt-8 rounded-[10px] border border-danger/40 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
            >
              {t("configError")}
            </div>
          )}

          {phase === "sent" ? (
            <div className="card rise-in mt-10 flex flex-col items-center gap-4 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line text-accent">
                <CheckIcon size={24} />
              </span>
              <p className="text-lg font-medium">{t("linkSent")}</p>
              <p className="text-sm leading-relaxed text-ink-2">
                {t("linkSentHint", { email })}
              </p>
              <p className="text-xs leading-relaxed text-ink-2">{t("linkSpamHint")}</p>
              <div className="mt-1 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => void sendMagicLink()}
                  disabled={cooldown > 0 || resending}
                  className="btn-secondary !min-h-[46px] text-sm"
                >
                  {resending
                    ? t("sending")
                    : cooldown > 0
                      ? t("resendIn", { seconds: cooldown })
                      : t("resend")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    setError(null);
                  }}
                  className="text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
                  style={{ minHeight: 44 }}
                >
                  {t("useAnotherEmail")}
                </button>
              </div>
            </div>
          ) : (
            <div className="rise-in" style={{ animationDelay: "210ms" }}>
              <form onSubmit={sendMagicLink} className="mt-10 flex flex-col gap-3">
                <label htmlFor="email" className="label-soft">
                  {t("emailLabel")}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ayan@example.kz"
                  className="input-base"
                />
                <button
                  type="submit"
                  disabled={phase === "sending" || !email.includes("@") || misconfigured}
                  className="btn-primary mt-2 w-full"
                >
                  <MailIcon size={18} />
                  {phase === "sending" ? t("sending") : t("sendLink")}
                </button>
              </form>

              <div className="my-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-line" />
                <span className="text-sm text-ink-2">{t("or")}</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={misconfigured}
                className="btn-secondary w-full"
              >
                <GoogleIcon size={18} />
                {t("continueGoogle")}
              </button>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="fade-in mt-6 rounded-[10px] border border-danger/40 bg-danger/5 p-4 text-center text-sm leading-relaxed text-danger"
            >
              {error}
            </p>
          )}

          <p
            className="rise-in mt-10 text-center text-sm leading-relaxed text-ink-2"
            style={{ animationDelay: "280ms" }}
          >
            {t("noPassword")}
          </p>
        </div>
      </div>

      {/* the world this tool serves */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/photos/ceremony-lights.jpg"
          alt=""
          fill
          sizes="45vw"
          priority
          className="object-cover"
        />
        <div aria-hidden className="veil veil-lift absolute inset-0" />
        <div aria-hidden className="photo-scrim absolute inset-x-0 bottom-0 h-48" />
        <p className="font-display absolute bottom-10 left-10 right-10 text-2xl leading-snug text-ivory">
          {t("photoCaption")}
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
