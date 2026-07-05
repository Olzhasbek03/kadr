import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FilmStyleDemo from "@/components/marketing/FilmStyleDemo";
import RevealDemo from "@/components/marketing/RevealDemo";
import Reveal from "@/components/marketing/Reveal";
import AnimatedCamera from "@/components/marketing/AnimatedCamera";
import PhoneDemo from "@/components/marketing/PhoneDemo";
import { ArrowRight, CameraIcon, MicIcon, VideoIcon } from "@/components/icons";

const GALLERY_STRIP = [
  { src: "/photos/kyz-dance.jpg", pos: "50% 30%" },
  { src: "/photos/ceremony-lights.jpg", pos: "50% 45%" },
  { src: "/photos/rings-gold.jpg", pos: "50% 55%" },
  { src: "/photos/chapel.jpg", pos: "50% 60%" },
];

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const modes = [
    { icon: <CameraIcon size={22} />, title: t("modePhotoTitle"), text: t("modePhotoText") },
    { icon: <VideoIcon size={22} />, title: t("modeVideoTitle"), text: t("modeVideoText") },
    { icon: <MicIcon size={22} />, title: t("modeVoiceTitle"), text: t("modeVoiceText") },
  ];

  const occasions = [1, 2, 3, 4, 5, 6].map((i) => t(`occasion${i}`));
  const faq = [1, 2, 3, 4, 5].map((i) => ({ q: t(`faq${i}q`), a: t(`faq${i}a`) }));

  return (
    <main className="min-h-dvh overflow-x-clip">
      {/* ─── hero: celebration photography vignetting into parchment ─── */}
      <section className="relative flex min-h-[100dvh] flex-col">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/photos/confetti.jpg"
            alt={t("heroAlt")}
            fill
            priority
            sizes="100vw"
            className="scale-105 object-cover blur-[5px]"
          />
        </div>
        <div aria-hidden className="photo-vignette absolute inset-0" />
        {/* the veil lifts as the page loads */}
        <div aria-hidden className="veil veil-lift absolute inset-0 z-10" />

        <header className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8">
          <span className="font-display text-[1.5rem] leading-none">Kormem</span>
          <div className="flex items-center gap-3 sm:gap-5">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="hidden text-sm text-ink-2 transition-colors hover:text-ink sm:block"
            >
              {t("signIn")}
            </Link>
            <span className="hidden sm:block">
              <Link href="/dashboard/new" className="btn btn-primary !min-h-[46px] !px-5 text-sm">
                {t("cta")}
              </Link>
            </span>
          </div>
        </header>

        <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-5 pb-24 text-center sm:px-8">
          <h1 className="rise-in font-display max-w-[18ch] text-[clamp(2.6rem,7vw,5.4rem)]">
            {t("heroTitle")}
          </h1>
          <p
            className="rise-in mt-6 max-w-lg text-[1.05rem] leading-[1.5] text-ink-2"
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
            <a href="#how" className="btn btn-dark">
              {t("ctaHow")}
            </a>
          </div>
        </div>
      </section>

      {/* ─── one camera, any occasion ─── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Reveal>
            <AnimatedCamera />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)]">
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
            <p className="mono-badge mt-8 !text-accent">{t("punLine")}</p>
          </Reveal>
        </div>
      </section>

      {/* ─── moments strip: the photography carries the mood ─── */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {GALLERY_STRIP.map((photo, i) => (
            <Reveal key={photo.src} delay={i * 0.06}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-[12px]">
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 46vw, 280px"
                  className="object-cover"
                  style={{ objectPosition: photo.pos }}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── how it works: the app itself, on three screens ─── */}
      <section id="how" className="border-t border-line/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <h2 className="font-display text-center text-[clamp(2rem,4.5vw,3.2rem)]">
              {t("howTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center leading-[1.5] text-ink-2">
              {t("howSub")}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-14">
            <PhoneDemo />
          </Reveal>
        </div>
      </section>

      {/* ─── three ways to leave a memory ─── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <h2 className="font-display text-center text-[clamp(2rem,4.5vw,3.2rem)]">
            {t("modesTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center leading-[1.5] text-ink-2">
            {t("modesSub")}
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {modes.map((mode, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="card h-full p-10">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-ink">
                  {mode.icon}
                </span>
                <h3 className="font-display mt-6 text-[1.45rem]">{mode.title}</h3>
                <p className="mt-3 leading-[1.5] text-ink-2">{mode.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── film styles, live ─── */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <Reveal>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)]">{t("stylesTitle")}</h2>
          <p className="mx-auto mt-4 max-w-md leading-[1.5] text-ink-2">{t("stylesSub")}</p>
        </Reveal>
        <Reveal delay={0.1} className="mt-12">
          <FilmStyleDemo />
        </Reveal>
      </section>

      {/* ─── the reveal: deep forest interlude ─── */}
      <section className="bg-dark text-ivory">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <h2 className="font-display text-center text-[clamp(2rem,4.5vw,3rem)]">
              {t("revealTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center leading-[1.5] text-ivory/70">
              {t("revealSub")}
            </p>
          </Reveal>
          <Reveal delay={0.12} className="mt-14">
            <RevealDemo />
          </Reveal>
        </div>
      </section>

      {/* ─── free: one line, no asterisks ─── */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <Reveal>
          <p className="numeral text-5xl">0 ₸</p>
          <p className="mt-3 font-medium">{t("planFree")}</p>
          <p className="mx-auto mt-2 max-w-[38ch] text-sm leading-[1.5] text-ink-2">
            {t("planFreeText")}
          </p>
        </Reveal>
      </section>

      {/* ─── FAQ ─── */}
      <section className="mx-auto max-w-2xl px-5 pb-20 sm:px-8 sm:pb-28">
        <Reveal>
          <h2 className="font-display text-center text-[clamp(2rem,4.5vw,3.2rem)]">
            {t("faqTitle")}
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="mt-10">
          <div className="flex flex-col">
            {faq.map((item, i) => (
              <details key={i} className="group border-t border-line last:border-b">
                <summary className="flex min-h-[62px] list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
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

      {/* ─── send-off ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/photos/chapel.jpg"
            alt=""
            fill
            sizes="100vw"
            className="scale-105 object-cover blur-[4px]"
          />
        </div>
        <div aria-hidden className="photo-vignette absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 py-28 text-center sm:px-8 sm:py-36">
          <Reveal>
            <h2 className="font-display mx-auto max-w-[20ch] text-[clamp(2rem,4.5vw,3.2rem)]">
              {t("ctaTitle")}
            </h2>
            <Link href="/dashboard/new" className="btn btn-primary mt-9">
              {t("cta")} <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ─── footer: absolute black anchor ─── */}
      <footer className="bg-black text-ivory/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-10 sm:px-8">
          <span className="font-display text-xl text-ivory">Kormem</span>
          <div className="flex items-center gap-6 text-sm">
            <LanguageSwitcher />
            <Link href="/privacy" className="transition-colors hover:text-ivory">
              {t("footerPrivacy")}
            </Link>
            <Link href="/login" className="transition-colors hover:text-ivory">
              {t("signIn")}
            </Link>
          </div>
          <span className="text-sm">{t("footer")}</span>
        </div>
      </footer>
    </main>
  );
}
