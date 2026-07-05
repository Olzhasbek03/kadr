"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { CameraIcon, MicIcon, PlayIcon, VideoIcon } from "@/components/icons";

/**
 * Three phone screens showing the real guest flow: scan and join, shoot
 * with live styles, then the revealed gallery. Built from the product's
 * own visual language (not screenshots) so it stays sharp on every
 * display and speaks all three languages.
 */
export default function PhoneDemo() {
  const t = useTranslations("landing");

  const steps = [
    { badge: "01", title: t("step1Title"), text: t("step1Text") },
    { badge: "02", title: t("step2Title"), text: t("step2Text") },
    { badge: "03", title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <div className="grid gap-10 md:grid-cols-3 md:gap-6">
      {/* 01 — join */}
      <figure className="flex flex-col items-center gap-5">
        <div className="phone-frame">
          <div className="phone-screen">
            <div className="phone-notch" />
            <div className="relative h-[38%] w-full overflow-hidden">
              <Image
                src="/photos/ceremony-lights.jpg"
                alt=""
                fill
                sizes="232px"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bg to-transparent" />
            </div>
            <div className="flex flex-col items-center px-4 pt-2 text-center">
              <p className="text-[9px] text-ink-2">{t("phoneJoinKicker")}</p>
              <p className="font-display mt-1 text-[15px] leading-tight">
                {t("phoneEventName")}
              </p>
              <div className="mt-4 w-full rounded-[4px] border border-line bg-surface px-2.5 py-2 text-left text-[10px] text-ink-2">
                {t("phoneNameField")}
              </div>
              <div className="mt-2 w-full rounded-[40px] border border-[#171615] bg-[#d6d5d4] px-2.5 py-2 text-center text-[10px] font-medium text-[#171615]">
                {t("phoneOpenCamera")}
              </div>
              <p className="mt-3 text-[8px] leading-relaxed text-ink-2">
                {t("phoneNoApp")}
              </p>
            </div>
          </div>
        </div>
        <figcaption className="max-w-[240px] text-center">
          <span className="mono-badge">{steps[0].badge}</span>
          <p className="mt-1.5 font-medium">{steps[0].title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{steps[0].text}</p>
        </figcaption>
      </figure>

      {/* 02 — camera */}
      <figure className="flex flex-col items-center gap-5">
        <div className="phone-frame">
          <div className="phone-screen !bg-dark">
            <div className="phone-notch" />
            <div className="relative m-1.5 h-[62%] overflow-hidden rounded-[16px]">
              <Image
                src="/photos/kyz-dance.jpg"
                alt=""
                fill
                sizes="232px"
                className="object-cover"
                style={{ filter: "sepia(0.28) saturate(1.35) contrast(1.05)" }}
              />
              <span className="numeral absolute right-2 top-2 rounded-full bg-dark/60 px-2 py-0.5 text-[9px] text-ivory">
                7 / 10
              </span>
            </div>
            <div className="scrollbar-none flex justify-center gap-1 overflow-hidden px-2 py-1.5">
              {["original", "noir", "polaroid"].map((s, i) => (
                <span
                  key={s}
                  className={`shrink-0 rounded-full border px-2 py-1 text-[8px] ${
                    i === 2
                      ? "border-accent-soft text-accent-soft"
                      : "border-ivory/20 text-ivory/60"
                  }`}
                >
                  {t(`phoneStyle${i + 1}`)}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 pt-1 text-ivory/70">
              <CameraIcon size={11} />
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ivory/50">
                <span className="h-6 w-6 rounded-full bg-ivory" />
              </span>
              <span className="flex items-center gap-1.5">
                <VideoIcon size={11} />
                <MicIcon size={11} />
              </span>
            </div>
          </div>
        </div>
        <figcaption className="max-w-[240px] text-center">
          <span className="mono-badge">{steps[1].badge}</span>
          <p className="mt-1.5 font-medium">{steps[1].title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{steps[1].text}</p>
        </figcaption>
      </figure>

      {/* 03 — revealed gallery */}
      <figure className="flex flex-col items-center gap-5">
        <div className="phone-frame">
          <div className="phone-screen">
            <div className="phone-notch" />
            <div className="px-3 pt-8">
              <p className="text-[8px] text-ink-2">{t("phoneRevealKicker")}</p>
              <p className="font-display text-[13px]">{t("phoneEventName")}</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 px-3">
              {[
                "/photos/kyz-dance.jpg",
                "/photos/confetti.jpg",
                "/photos/rings-gold.jpg",
                "/photos/chapel.jpg",
              ].map((src, i) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded-[4px]">
                  <Image src={src} alt="" fill sizes="110px" className="object-cover" />
                  {i === 1 && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dark/55 text-ivory">
                        <PlayIcon size={10} />
                      </span>
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mx-3 mt-2 flex items-center gap-2 rounded-[4px] border border-line bg-surface px-2 py-1.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-ivory">
                <PlayIcon size={9} />
              </span>
              <span className="h-0.5 flex-1 rounded-full bg-line">
                <span className="block h-full w-1/3 rounded-full bg-accent" />
              </span>
              <MicIcon size={10} className="shrink-0 text-accent" />
            </div>
          </div>
        </div>
        <figcaption className="max-w-[240px] text-center">
          <span className="mono-badge">{steps[2].badge}</span>
          <p className="mt-1.5 font-medium">{steps[2].title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{steps[2].text}</p>
        </figcaption>
      </figure>
    </div>
  );
}
