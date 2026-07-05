"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabaseBrowser } from "@/lib/supabase/browser";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Image from "next/image";
import { ArrowLeft, CheckIcon, GoogleIcon, MailIcon } from "@/components/icons";

function LoginForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(urlError ? t("errorGeneric") : null);

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || phase === "sending") return;
    setError(null);
    setPhase("sending");
    const { error: err } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    if (err) {
      setError(t("errorGeneric"));
      setPhase("idle");
    } else {
      setPhase("sent");
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    const { error: err } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (err) setError(t("errorGeneric"));
  };

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_0.85fr]">
      <div className="relative flex flex-col px-6">
      <header className="relative flex items-center justify-between py-6">
        <Link href="/" className="icon-btn" aria-label={t("backHome")}>
          <ArrowLeft size={20} />
        </Link>
        <LanguageSwitcher />
      </header>

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-24">
        <h1 className="font-display text-center text-4xl leading-tight">{t("title")}</h1>
        <p className="mt-3 text-center text-ink-2">{t("subtitle")}</p>

        {phase === "sent" ? (
          <div className="card rise-in mt-10 flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line text-accent">
              <CheckIcon size={24} />
            </span>
            <p className="font-medium">{t("linkSent")}</p>
            <p className="text-sm leading-relaxed text-ink-2">
              {t("linkSentHint", { email })}
            </p>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className="text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
              style={{ minHeight: 44 }}
            >
              {t("useAnotherEmail")}
            </button>
          </div>
        ) : (
          <>
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
                disabled={phase === "sending" || !email.includes("@")}
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

            <button type="button" onClick={signInWithGoogle} className="btn-secondary w-full">
              <GoogleIcon size={18} />
              {t("continueGoogle")}
            </button>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-center text-sm text-danger"
          >
            {error}
          </p>
        )}

        <p className="mt-10 text-center text-sm leading-relaxed text-ink-2">
          {t("noPassword")}
        </p>
      </div>
      </div>

      {/* the world this tool serves */}
      <div className="relative hidden lg:block">
        <Image
          src="/photos/ceremony-lights.jpg"
          alt=""
          fill
          sizes="45vw"
          className="object-cover"
        />
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
