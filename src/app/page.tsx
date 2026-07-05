import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FilmStyleDemo from "@/components/marketing/FilmStyleDemo";
import RevealDemo from "@/components/marketing/RevealDemo";
import Reveal from "@/components/marketing/Reveal";
import { ArrowRight } from "@/components/icons";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const steps = [1, 2, 3].map((i) => ({
    title: t(`step${i}Title`),
    text: t(`step${i}Text`),
    photo: ["/photos/ceremony.jpg", "/photos/run-bw.jpg", "/photos/garden.jpg"][i - 1],
  }));

  const faq = [1, 2, 3, 4, 5].map((i) => ({ q: t(`faq${i}q`), a: t(`faq${i}a`) }));

  return (
    <main className="min-h-dvh overflow-x-clip">
      {/* ─── hero: the photograph is the interface ─── */}
      <section className="relative flex min-h-[100dvh] flex-col">
        <Image
          src="/photos/hero-golden.jpg"
          alt={t("heroAlt")}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_38%]"
        />
        <div aria-hidden className="photo-scrim absolute inset-0" />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-dark/50 to-transparent"
        />
        {/* the veil lifts as the page loads */}
        <div aria-hidden className="veil veil-lift absolute inset-0 z-10" />

        <header className="relative z-20 flex items-center justify-between px-5 py-5 text-ivory sm:px-8">
          <span className="font-display text-[1.55rem] leading-none">Kormem</span>
          <div className="flex items-center gap-4 sm:gap-6">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="hidden text-sm font-medium opacity-80 transition-opacity hover:opacity-100 sm:block"
            >
              {t("signIn")}
            </Link>
          </div>
        </header>

        <div className="relative z-20 mt-auto px-5 pb-14 text-ivory sm:px-8 sm:pb-20">
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="rise-in font-display max-w-[13ch] text-[clamp(2.5rem,7vw,5.2rem)] leading-[1.06]">
              {t("heroTitle")}
            </h1>
            <p
              className="rise-in mt-5 max-w-md text-[1.05rem] leading-relaxed text-ivory/85"
              style={{ animationDelay: "120ms" }}
            >
              {t("heroSub")}
            </p>
            <div
              className="rise-in mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "220ms" }}
            >
              <Link href="/dashboard/new" className="btn btn-dark">
                {t("cta")} <ArrowRight size={18} />
              </Link>
              <a
                href="#betashar"
                className="btn inline-flex min-h-[56px] items-center rounded-full border border-ivory/45 px-6 font-medium text-ivory transition-colors hover:border-ivory"
              >
                {t("ctaHow")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── беташар: the idea ─── */}
      <section id="betashar" className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.05fr] md:gap-16">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] md:aspect-[3/2]">
              <Image
                src="/photos/veil.jpg"
                alt={t("betasharAlt")}
                fill
                sizes="(max-width: 768px) 92vw, 560px"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.14]">
              {t("betasharTitle")}
            </h2>
            <p className="mt-5 max-w-[52ch] leading-relaxed text-ink-2">
              {t("betasharBody")}
            </p>
            <p className="font-display mt-6 text-lg text-crimson">{t("betasharPun")}</p>
          </Reveal>
        </div>
      </section>

      {/* ─── how: a real sequence, numbered honestly ─── */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-4xl px-5 py-24 sm:px-8 sm:py-28">
          <Reveal>
            <h2 className="font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-tight">
              {t("howTitle")}
            </h2>
          </Reveal>
          <div className="mt-12 flex flex-col">
            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className="flex items-center gap-6 border-t border-line py-8 first:border-t-0 sm:gap-10">
                  <span className="numeral w-12 shrink-0 text-right text-5xl text-crimson/85 sm:text-6xl">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold sm:text-xl">{step.title}</h3>
                    <p className="mt-1.5 max-w-[46ch] leading-relaxed text-ink-2">
                      {step.text}
                    </p>
                  </div>
                  <div className="relative hidden h-24 w-20 shrink-0 overflow-hidden rounded-[10px] sm:block sm:h-28 sm:w-24">
                    <Image src={step.photo} alt="" fill sizes="96px" className="object-cover" />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── six film styles, live ─── */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 sm:py-28">
          <Reveal>
            <h2 className="font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-tight">
              {t("stylesTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-2">{t("stylesSub")}</p>
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            <FilmStyleDemo />
          </Reveal>
        </div>
      </section>

      {/* ─── the reveal: deliberate dark block ─── */}
      <section className="bg-dark text-ivory">
        <div className="mx-auto max-w-5xl px-5 py-24 sm:px-8 sm:py-32">
          <Reveal>
            <h2 className="font-display text-center text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.12]">
              {t("revealTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center leading-relaxed text-ivory/70">
              {t("revealSub")}
            </p>
          </Reveal>
          <Reveal delay={0.12} className="mt-14">
            <RevealDemo />
          </Reveal>
        </div>
      </section>

      {/* ─── free: one line, no asterisks ─── */}
      <section className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-28">
        <Reveal>
          <p className="numeral text-5xl">0 ₸</p>
          <p className="mt-3 font-semibold">{t("planFree")}</p>
          <p className="mx-auto mt-2 max-w-[38ch] text-sm leading-relaxed text-ink-2">
            {t("planFreeText")}
          </p>
        </Reveal>
      </section>

      {/* ─── FAQ ─── */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-2xl px-5 py-24 sm:px-8 sm:py-28">
          <Reveal>
            <h2 className="font-display text-center text-[clamp(1.9rem,4vw,2.8rem)] leading-tight">
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
                  <p className="max-w-[60ch] pb-6 leading-relaxed text-ink-2">{item.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── filmstrip send-off ─── */}
      <section className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-32">
        <Reveal>
          <div className="mx-auto flex max-w-lg items-end justify-center gap-3">
            {["/photos/rings.jpg", "/photos/steppe.jpg", "/photos/hall-bw.jpg"].map(
              (src, i) => (
                <div
                  key={src}
                  className={`relative overflow-hidden rounded-[10px] ${
                    i === 1 ? "h-44 w-32 sm:h-52 sm:w-40" : "h-36 w-26 sm:h-44 sm:w-32"
                  }`}
                  style={{ rotate: `${(i - 1) * 3}deg` }}
                >
                  <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                </div>
              )
            )}
          </div>
          <h2 className="font-display mx-auto mt-12 max-w-[16ch] text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.12]">
            {t("ctaTitle")}
          </h2>
          <Link href="/dashboard/new" className="btn btn-primary mt-9">
            {t("cta")} <ArrowRight size={18} />
          </Link>
        </Reveal>
      </section>

      {/* ─── footer ─── */}
      <footer className="bg-dark text-ivory/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-9 sm:px-8">
          <span className="font-display text-xl text-ivory">Kormem</span>
          <div className="flex items-center gap-6 text-sm">
            <LanguageSwitcher />
            <Link href="/login" className="transition-opacity hover:text-ivory">
              {t("signIn")}
            </Link>
          </div>
          <span className="text-sm">{t("footer")}</span>
        </div>
      </footer>
    </main>
  );
}
