"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  CakeIcon,
  GlassIcon,
  HeartIcon,
  PlaneIcon,
  SparkleIcon,
} from "@/components/icons";

type OccasionKey = "wedding" | "birthday" | "trip" | "party" | "everyday";

/** Which photos each occasion shows. Sets may share photos; each switch
 *  re-runs the develop-in animation so the change reads as a reveal. */
const OCCASION_PHOTOS: Record<OccasionKey, { src: string; pos?: string }[]> = {
  wedding: [
    { src: "/photos/ceremony-lights.jpg", pos: "50% 45%" },
    { src: "/photos/rings-gold.jpg" },
    { src: "/photos/wedding-golden-lift.jpg" },
  ],
  birthday: [
    { src: "/photos/birthday.jpg" },
    { src: "/photos/birthday-decor-neon.jpg" },
    { src: "/photos/birthday-cake-closeup.jpg" },
  ],
  trip: [
    { src: "/photos/trip-passports.jpg" },
    { src: "/photos/trip-mountain-friends.jpg" },
    { src: "/photos/yacht-jetski.jpg" },
  ],
  party: [
    { src: "/photos/confetti.jpg" },
    { src: "/photos/friends-sunset-walk.jpg", pos: "50% 25%" },
    { src: "/photos/friends-night-grass.jpg" },
  ],
  everyday: [
    { src: "/photos/friends-dinner.jpg" },
    { src: "/photos/trip-mountain-friends.jpg" },
    { src: "/photos/yacht-jetski.jpg" },
  ],
};

const OCCASION_ICONS: Record<OccasionKey, React.ReactNode> = {
  wedding: <HeartIcon size={16} />,
  birthday: <CakeIcon size={16} />,
  trip: <PlaneIcon size={16} />,
  party: <GlassIcon size={16} />,
  everyday: <SparkleIcon size={16} />,
};

const OCCASIONS: OccasionKey[] = ["wedding", "birthday", "trip", "party", "everyday"];

export default function OccasionShowcase() {
  const t = useTranslations("landing");
  const [active, setActive] = useState<OccasionKey>("wedding");

  return (
    <div>
      <p className="mono-badge text-center uppercase tracking-[0.25em]">
        {t("useCasesKicker")}
      </p>
      <h2 className="font-display mx-auto mt-4 max-w-[24ch] text-center text-[clamp(2rem,4.5vw,3.2rem)]">
        {t("useCasesTitle")}
      </h2>

      {/* occasion switcher */}
      <div
        className="scrollbar-none mt-9 flex justify-start gap-2 overflow-x-auto px-1 sm:justify-center"
        role="tablist"
        aria-label={t("useCasesKicker")}
      >
        {OCCASIONS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => setActive(key)}
            className={`flex shrink-0 items-center gap-2 rounded-[40px] border px-4 text-sm font-medium transition-colors ${
              active === key
                ? "border-accent bg-accent/5 text-ink"
                : "border-line bg-transparent text-ink-2 hover:border-line-strong"
            }`}
            style={{ minHeight: 46 }}
          >
            {OCCASION_ICONS[key]}
            {t(`useCase_${key}`)}
          </button>
        ))}
      </div>

      {/* photos for the chosen occasion; key remount replays develop-in */}
      <div key={active} className="mt-8 grid grid-cols-3 gap-3">
        {OCCASION_PHOTOS[active].map((photo, i) => (
          <div
            key={photo.src}
            className="develop-in relative aspect-[3/4] overflow-hidden rounded-[12px]"
            style={{ ["--dev-delay" as string]: `${i * 90}ms` }}
          >
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="(max-width: 768px) 30vw, 370px"
              className="object-cover"
              style={photo.pos ? { objectPosition: photo.pos } : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
