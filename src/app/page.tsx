import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FilmStyleDemo from "@/components/marketing/FilmStyleDemo";
import RevealDemo from "@/components/marketing/RevealDemo";
import Reveal from "@/components/marketing/Reveal";
import AnimatedCamera from "@/components/marketing/AnimatedCamera";
import { ArrowRight, CameraIcon, MicIcon, VideoIcon } from "@/components/icons";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const steps = [1, 2, 3].map((i) => ({
    title: t(`step${i}Title`),
    text: t(`step${i}Text`),
  }));

  const modes = [
    { icon: <CameraIcon size={22} />, title: t("modePhotoTitle"), text: t("modePhotoText") },
    { icon: <VideoIcon size={22} />, title: t("modeVideoTitle"), text: t("modeVideoText") },
    { icon: <MicIcon size={22} />, title: t("modeVoiceTitle"), text: t("modeVoiceText") },
  ];

  const occasions = [1, 2, 3, 4, 5, 6].map((i) => t(`occasion${i}`));
  const faq = [1, 2, 3, 4, 5].map((i) => ({ q: t(`faq${i}q`), a: t(`faq${i}a`) }));

  return (
    <main className="min-h-dvh overflow-x-clip">
      {/* ─── hero: full-bleed blue hour, centered stack ─── */}
      <section className="relative flex min-h-[100dvh] flex-col">
        <Image
          src="/photos/dance.jpg"
          alt={t("heroAlt")}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_30%]"
        />
        <div aria-hidden className="absolute inset-0 bg-bg/30" />
        <div aria-hidden className="photo-scrim absolute inset-0" />
        {/* the veil lifts as the page loads */}
        <div aria-hidden className="veil veil-lift absolute inset-0 z-10" />

        <header className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8">
          <span className="font-display text-[1.45rem] leading-none">Kormem</span>
          <div className="flex items-center gap-3 sm:gap-5">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="hidden text-sm text-ink-2 transition-colors hover:text-ink sm:block"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/dashboard/new"
              className="btn btn-primary hidden !min-h-[46px] !px-5 text-sm sm:inline-flex"
            >
              {t("cta")}
            </Link>
          </div>
        </header>

        <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-5 pb-24 text-center sm:px-8">
          <h1 className="rise-in font-display max-w-[16ch] text-[clamp(2.2rem,6.5vw,4.1rem)]">
            {t("heroTitle")}
          </h1>
          <p
            className="rise-in mt-6 max-w-lg text-[1.1rem] leading-[1.5] text-ink-2"
            style={{ animationDelay: "120ms" }}
          >
            {t("heroSub")}
          </p>
          <div
            className="rise-in mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "220ms" }}
          >
            <Link href="/dashboard/new" className="btn btn-primary">
              {t("cta")} <ArrowRight size={18} />
            </Link>
            <a href="#occasions" className="btn btn-secondary">
              {t("ctaHow")}
            </a>
          </div>
        </div>
      </section>

      {/* ─── one camera, any occasion ─── */}
      <section id="occasions" className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 sm:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Reveal>
            <AnimatedCamera />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-[clamp(1.9rem,4vw,2.7rem)]">
              {t("occasionsTitle")}
            </h2>
            <p className="mt-5 max-w-[52ch] leading-[1.5] text-ink-2">{t("occasionsBody")}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {occasions.map((label) => (
                <span key={label} className="chip">
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-8 text-sm text-accent-soft">{t("punLine")}</p>
          </Reveal>
        </div>
      </section>

      {/* ─── three ways to leave a memory ─── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 sm:py-28">
        <Reveal>
          <h2 className="font-display text-center text-[clamp(1.9rem,4vw,2.7rem)]">
            {t("modesTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center leading-[1.5] text-ink-2">
            {t("modesSub")}
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {modes.map((mode, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="card h-full p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink">
                  {mode.icon}
                </span>
                <h3 className="font-display mt-6 text-[1.35rem]">{mode.title}</h3>
                <p className="mt-3 leading-[1.5] text-ink-2">{mode.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── how the night goes ─── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 sm:py-28">
        <Reveal>
          <h2 className="font-display text-center text-[clamp(1.9rem,4vw,2.7rem)]">
            {t("howTitle")}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="card h-full p-8">
                <span className="numeral text-4xl text-accent-soft">{i + 1}</span>
                <h3 className="mt-5 text-lg font-[480]">{step.title}</h3>
                <p className="mt-2.5 leading-[1.5] text-ink-2">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── film styles, live ─── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 text-center sm:px-8 sm:py-28">
        <Reveal>
          <h2 className="font-display text-[clamp(1.9rem,4vw,2.7rem)]">{t("stylesTitle")}</h2>
          <p className="mx-auto mt-4 max-w-md leading-[1.5] text-ink-2">{t("stylesSub")}</p>
        </Reveal>
        <Reveal delay={0.1} className="mt-12">
          <FilmStyleDemo />
        </Reveal>
      </section>

      {/* ─── the reveal ─── */}
      <section className="bg-dark">
        <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 sm:py-32">
          <Reveal>
            <h2 className="font-display text-center text-[clamp(2rem,4.5vw,3rem)]">
              {t("revealTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center leading-[1.5] text-ink-2">
              {t("revealSub")}
            </p>
          </Reveal>
          <Reveal delay={0.12} className="mt-14">
            <RevealDemo />
          </Reveal>
        </div>
      </section>

      {/* ─── free: one line, no asterisks ─── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 text-center sm:px-8 sm:py-28">
        <Reveal>
          <p className="numeral text-5xl">0 ₸</p>
          <p className="mt-3 font-[480]">{t("planFree")}</p>
          <p className="mx-auto mt-2 max-w-[38ch] text-sm leading-[1.5] text-ink-2">
            {t("planFreeText")}
          </p>
        </Reveal>
      </section>

      {/* ─── FAQ ─── */}
      <section className="mx-auto max-w-2xl px-5 py-24 sm:px-8 sm:py-28">
        <Reveal>
          <h2 className="font-display text-center text-[clamp(1.9rem,4vw,2.7rem)]">
            {t("faqTitle")}
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="mt-10">
          <div className="flex flex-col">
            {faq.map((item, i) => (
              <details key={i} className="group border-t border-line last:border-b">
                <summary className="flex min-h-[62px] list-none items-center justify-between gap-4 py-4 font-[420] [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="text-xl font-light text-ink-2 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-[60ch] pb-6 leading-[1.5] text-ink-2">{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ─── filmstrip send-off ─── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 text-center sm:px-8 sm:py-32">
        <Reveal>
          <div className="mx-auto flex max-w-lg items-end justify-center gap-3">
            {["/photos/field.jpg", "/photos/dance.jpg", "/photos/hall-bw.jpg"].map(
              (src, i) => (
                <div
                  key={src}
                  className={`relative overflow-hidden rounded-[12px] ${
                    i === 1 ? "h-40 w-28 sm:h-52 sm:w-40" : "h-32 w-24 sm:h-44 sm:w-32"
                  }`}
                  style={{ rotate: `${(i - 1) * 3}deg` }}
                >
                  <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                </div>
              )
            )}
          </div>
          <h2 className="font-display mx-auto mt-12 max-w-[18ch] text-[clamp(2rem,4.5vw,3rem)]">
            {t("ctaTitle")}
          </h2>
          <Link href="/dashboard/new" className="btn btn-primary mt-9">
            {t("cta")} <ArrowRight size={18} />
          </Link>
        </Reveal>
      </section>

      {/* ─── footer ─── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-5 px-5 py-9 text-ink-2 sm:px-8">
          <span className="font-display text-xl text-ink">Kormem</span>
          <div className="flex items-center gap-6 text-sm">
            <LanguageSwitcher />
            <Link href="/privacy" className="transition-colors hover:text-ink">
              {t("footerPrivacy")}
            </Link>
            <Link href="/login" className="transition-colors hover:text-ink">
              {t("signIn")}
            </Link>
          </div>
          <span className="text-sm">{t("footer")}</span>
        </div>
      </footer>
    </main>
  );
}
