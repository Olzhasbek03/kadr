"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES } from "@/i18n/locales";
import { setLocale } from "@/app/actions/locale";

const LABELS: Record<string, string> = { kk: "Қаз", ru: "Рус", en: "Eng" };

/** Inherits currentColor so it sits on ivory pages and photographs alike. */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="inline-flex items-center gap-0.5" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setLocale(l);
              router.refresh();
            })
          }
          className={`px-1.5 text-[0.85rem] transition-opacity ${
            l === locale
              ? "font-semibold underline decoration-1 underline-offset-4 opacity-100"
              : "font-medium opacity-55 hover:opacity-85"
          }`}
          style={{ minHeight: 44 }}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
