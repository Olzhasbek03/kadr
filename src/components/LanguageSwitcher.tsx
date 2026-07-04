"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES } from "@/i18n/locales";
import { setLocale } from "@/app/actions/locale";

const LABELS: Record<string, string> = { kk: "ҚАЗ", ru: "РУС", en: "ENG" };

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="inline-flex items-center" role="group" aria-label="Language">
      {LOCALES.map((l, i) => (
        <span key={l} className="inline-flex items-center">
          {i > 0 && <span className="px-1.5 text-[0.7rem] text-neutral-700">·</span>}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setLocale(l);
                router.refresh();
              })
            }
            className={`px-1.5 text-[0.78rem] font-semibold tracking-[0.18em] transition ${
              l === locale ? "text-white" : "text-neutral-500 hover:text-neutral-300"
            }`}
            style={{ minHeight: 44 }}
          >
            {LABELS[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
