"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatKzt } from "@/lib/config";
import { LockIcon, Mark } from "@/components/icons";

/** Activation gate for draft events: starts checkout with the configured
 *  payment provider (Kaspi in production, sandbox in dev). */
export default function PayCard({ eventId, price }: { eventId: string; price: number }) {
  const t = useTranslations("event");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data.activated) {
        router.refresh();
      } else if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error("no url");
      }
    } catch {
      setError(tc("error"));
      setPending(false);
    }
  };

  return (
    <section className="card border-crimson/25 p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crimson/10 text-crimson">
            <LockIcon size={20} />
          </span>
          <div>
            <h2 className="font-display text-2xl">{t("draftTitle")}</h2>
            <p className="mt-1.5 max-w-md text-[0.95rem] leading-relaxed text-ink-2">
              {t("draftText")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <span className="numeral text-3xl text-crimson">{formatKzt(price)}</span>
          <button type="button" onClick={pay} disabled={pending} className="btn-primary">
            {pending ? <Mark size={18} className="animate-spin" /> : t("payActivate")}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
