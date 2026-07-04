import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { config, formatKzt } from "@/lib/config";
import { FILTER_CSS } from "@/lib/filters";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FilmStyleDemo from "@/components/marketing/FilmStyleDemo";
import RevealDemo from "@/components/marketing/RevealDemo";
import { HeroGlow, PhotoArt } from "@/components/ArtDecor";
import {
  ArrowRight,
  CheckIcon,
  DownloadIcon,
  FilmIcon,
  LockIcon,
  Mark,
  QrIcon,
  ShieldIcon,
} from "@/components/icons";

/** Static camera-UI mockup inside a phone frame — the product, immediately. */
function PhoneMockup({
  counterLabel,
  filterLabels,
}: {
  counterLabel: string;
  filterLabels: string[];
}) {
  return (
    <div className="relative mx-auto w-[272px] shrink-0 sm:w-[295px]">
      <div className="rounded-[3rem] border-[9px] border-[#1d1811] bg-black shadow-[0_40px_90px_rgba(0,0,0,0.7)]">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[2.4rem]">
          <PhotoArt
            id="hero-phone"
            className="absolute inset-0 h-full w-full"
            style={{ filter: FILTER_CSS.warm }}
          />
          <div aria-hidden className="film-grain absolute inset-0" />
          <div className="absolute left-1/2 top-2.5 z-20 h-[20px] w-20 -translate-x-1/2 rounded-full bg-[#1d1811]" />

          {/* counter chip */}
          <span className="absolute right-3 top-9 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur">
            <FilmIcon size={12} className="text-accent" />
            <span className="stat-numeral text-sm leading-none text-ink">{counterLabel}</span>
          </span>

          {/* filter chips + shutter */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 pb-5">
            <div className="flex gap-1.5">
              {filterLabels.map((label, i) => (
                <span
                  key={i}
                  className={`rounded-full px-2.5 py-1 text-[9px] font-medium backdrop-blur ${
                    i === 1
                      ? "border border-accent/70 bg-black/60 text-accent-strong"
                      : "bg-black/45 text-ink/70"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
            <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-ink/40">
              <span className="h-[44px] w-[44px] rounded-full bg-ink" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tf = await getTranslations("camera.filterNames");

  const steps = [1, 2, 3].map((i) => ({
    title: t(`step${i}Title`),
    text: t(`step${i}Text`),
  }));

  const trust = [
    { icon: <ShieldIcon size={20} />, title: t("trust1Title"), text: t("trust1Text") },
    { icon: <LockIcon size={20} />, title: t("trust2Title"), text: t("trust2Text") },
    { icon: <DownloadIcon size={20} />, title: t("trust3Title"), text: t("trust3Text") },
    { icon: <QrIcon size={20} />, title: t("trust4Title"), text: t("trust4Text") },
  ];

  const faq = [1, 2, 3, 4, 5].map((i) => ({
    q: t(`faq${i}q`),
    a: t(`faq${i}a`),
  }));

  const freeFeatures = [1, 2, 3].map((i) => t(`planFreeF${i}`));
  const paidFeatures = [1, 2, 3, 4].map((i) => t(`planPaidF${i}`));

  return (
    <main className="min-h-dvh overflow-x-clip">
      {/* nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <span className="flex items-center gap-2">
          <Mark size={17} className="text-accent" />
          <span className="font-serif-display text-2xl">Kadr</span>
        </span>
        <div className="flex items-center gap-5">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="hidden text-sm font-medium text-muted transition hover:text-ink sm:block"
          >
            {t("signIn")}
          </Link>
          <Link href="/dashboard/new" className="btn btn-primary !min-h-[48px] !px-5 text-sm">
            {t("navCta")}
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
        <HeroGlow
          id="hero-glow"
          className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[560px] w-full"
        />
        <div className="text-center lg:text-left">
          <p className="microlabel">{t("badge")}</p>
          <h1 className="display-huge mx-auto mt-6 max-w-2xl lg:mx-0">
            {t("heroL1")}
            <br />
            {t("heroL2")}
            <br />
            <span className="text-accent-strong">{t("heroL3")}</span>
          </h1>
          <p className="mx-auto mt-7 max-w-md text-lg leading-relaxed text-muted lg:mx-0">
            {t("heroSub")}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link href="/dashboard/new" className="btn btn-primary">
              {t("cta")} <ArrowRight size={18} />
            </Link>
            <a href="#how" className="btn btn-secondary">
              {t("ctaHow")}
            </a>
          </div>

          {/* honest numeric strip */}
          <div className="mt-14 flex justify-center gap-10 lg:justify-start">
            {[
              ["0", t("factApps")],
              [String(15), t("factShots")],
              ["1", t("factGallery")],
            ].map(([num, label], i) => (
              <div key={i} className="text-center lg:text-left">
                <div className="stat-numeral text-4xl text-accent-strong">{num}</div>
                <div className="microlabel mt-1.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <PhoneMockup
          counterLabel="9 / 15"
          filterLabels={[tf("original"), tf("warm"), tf("noir")]}
        />
      </section>

      {/* how a night becomes a film */}
      <section id="how" className="border-t border-line py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="microlabel text-center">{t("howKicker")}</p>
          <h2 className="font-serif-display mt-3 text-center text-4xl sm:text-5xl">
            {t("howTitle")}
          </h2>
          <div className="mt-14 flex flex-col">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-7 border-t border-line py-9 first:border-t-0"
              >
                <span className="stat-numeral w-10 shrink-0 text-right text-4xl text-accent/60">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-serif-display text-2xl">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* film styles — live demo */}
      <section className="border-t border-line py-24">
        <div className="mx-auto max-w-4xl px-6">
          <p className="microlabel text-center">{t("stylesKicker")}</p>
          <h2 className="font-serif-display mt-3 text-center text-4xl sm:text-5xl">
            {t("stylesTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center leading-relaxed text-muted">
            {t("stylesSub")}
          </p>
          <div className="mt-12">
            <FilmStyleDemo />
          </div>
        </div>
      </section>

      {/* the reveal — centerpiece */}
      <section className="border-t border-line py-24">
        <div className="mx-auto max-w-4xl px-6">
          <p className="microlabel text-center">{t("revealKicker")}</p>
          <h2 className="font-serif-display mt-3 text-center text-4xl sm:text-5xl">
            {t("revealTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center leading-relaxed text-muted">
            {t("revealSub")}
          </p>
          <div className="mt-12">
            <RevealDemo />
          </div>
        </div>
      </section>

      {/* trust */}
      <section className="border-t border-line py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="font-serif-display text-center text-4xl">{t("trustTitle")}</h2>
          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {trust.map((item, i) => (
              <div key={i} className="card flex items-start gap-4 p-6">
                <span className="mt-0.5 shrink-0 text-accent">{item.icon}</span>
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* pricing */}
      <section className="border-t border-line py-24">
        <div className="mx-auto max-w-4xl px-6">
          <p className="microlabel text-center">{t("pricingKicker")}</p>
          <h2 className="font-serif-display mt-3 text-center text-4xl sm:text-5xl">
            {t("pricingTitle")}
          </h2>
          <div className="mx-auto mt-12 grid max-w-2xl gap-4 sm:grid-cols-2">
            <div className="card p-7">
              <p className="microlabel">{t("planFree")}</p>
              <p className="stat-numeral mt-3 text-4xl">0 ₸</p>
              <p className="mt-1 text-sm text-muted">
                {t("planFreeFor", { count: config.freeGuestLimit })}
              </p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {freeFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[0.95rem] text-muted">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-accent" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card safelight border-accent/30 p-7">
              <p className="microlabel text-accent-strong">{t("planPaid")}</p>
              <p className="stat-numeral mt-3 text-4xl">{formatKzt(config.eventPriceKzt)}</p>
              <p className="mt-1 text-sm text-muted">{t("planPaidFor")}</p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {paidFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[0.95rem] text-muted">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-accent" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-muted">{t("pricingNote")}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line py-24">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-serif-display text-center text-4xl">{t("faqTitle")}</h2>
          <div className="mt-12 flex flex-col">
            {faq.map((item, i) => (
              <details key={i} className="group border-t border-line last:border-b">
                <summary className="flex min-h-[64px] list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="text-xl font-light text-muted transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-6 leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section className="border-t border-line py-28 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <Mark size={22} className="mx-auto text-accent" />
          <h2 className="font-serif-display mt-7 text-4xl leading-tight sm:text-5xl">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-muted">{t("ctaSub")}</p>
          <Link href="/dashboard/new" className="btn btn-primary mt-10">
            {t("cta")} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-muted">
          <span className="flex items-center gap-2">
            <Mark size={13} className="text-accent" />
            <span className="font-serif-display text-base text-ink">Kadr</span>
            <span className="ml-1">· {t("footer")}</span>
          </span>
          <div className="flex items-center gap-5">
            <Link href="/login" className="transition hover:text-ink">
              {t("signIn")}
            </Link>
            <a href="#how" className="transition hover:text-ink">
              {t("ctaHow")}
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
