"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

function parts(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

/** Ticking reveal countdown with serif numerals. Refreshes the route when
 *  it hits zero so server components flip to the revealed state. */
export default function Countdown({
  target,
  refreshOnZero = false,
}: {
  target: string;
  refreshOnZero?: boolean;
}) {
  const t = useTranslations("countdown");
  const router = useRouter();
  const [left, setLeft] = useState(() => new Date(target).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date(target).getTime() - Date.now();
      setLeft(next);
      if (next <= 0) {
        clearInterval(id);
        if (refreshOnZero) setTimeout(() => router.refresh(), 1200);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, refreshOnZero, router]);

  const p = parts(left);
  const cells: Array<[number, string]> = [
    [p.d, t("days")],
    [p.h, t("hours")],
    [p.m, t("minutes")],
    [p.s, t("seconds")],
  ];
  const visible = p.d > 0 ? cells : cells.slice(1);

  return (
    <div className="flex items-end justify-center gap-6 sm:gap-9" role="timer">
      {visible.map(([num, label], i) => (
        <div key={i} className="text-center">
          <div
            className="numeral text-5xl text-crimson sm:text-6xl"
            suppressHydrationWarning
          >
            {String(num).padStart(2, "0")}
          </div>
          <div className="label-soft mt-2">{label}</div>
        </div>
      ))}
    </div>
  );
}
