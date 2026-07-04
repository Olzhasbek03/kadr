"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatKzt } from "@/lib/config";
import { CheckIcon, Mark } from "@/components/icons";

type Phase = "idle" | "processing" | "paid" | "failed";

/**
 * Sandbox checkout, visually separate from the app on purpose — it stands
 * in for the external bank screen the host would see with real Kaspi Pay.
 */
export default function MockCheckout({
  externalId,
  amount,
  eventName,
  returnUrl,
  alreadyPaid,
}: {
  externalId: string;
  amount: number;
  eventName: string;
  returnUrl: string;
  alreadyPaid: boolean;
}) {
  const t = useTranslations("mockPay");
  const [phase, setPhase] = useState<Phase>(alreadyPaid ? "paid" : "idle");

  const complete = async (outcome: "paid" | "failed") => {
    if (phase === "processing") return;
    setPhase("processing");
    try {
      const res = await fetch("/api/payments/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId, outcome }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setPhase(outcome);
      if (outcome === "paid") {
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 1400);
      }
    } catch {
      setPhase("failed");
    }
  };

  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-[#f5f3f0] px-5 text-neutral-900"
      style={{ colorScheme: "light" }}
    >
      <div className="w-full max-w-sm">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
          {t("sandboxBadge")}
        </p>
        <div className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight text-[#f14635]">
              Pay<span className="text-neutral-900">·KZ</span>
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
              {t("secure")}
            </span>
          </div>

          <p className="mt-8 text-sm text-neutral-500">{t("payingFor")}</p>
          <p className="mt-1 text-lg font-semibold">{eventName}</p>
          <p className="mt-5 text-4xl font-bold tracking-tight">{formatKzt(amount)}</p>

          {phase === "paid" ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl bg-green-50 p-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white">
                <CheckIcon size={22} />
              </span>
              <p className="font-semibold text-green-700">{t("success")}</p>
              <p className="text-sm text-green-600">{t("redirecting")}</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={phase === "processing"}
                onClick={() => complete("paid")}
                className="mt-8 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#f14635] font-semibold text-white transition hover:bg-[#d93c2c] active:scale-[0.99] disabled:opacity-60"
              >
                {phase === "processing" ? (
                  <Mark size={18} className="animate-spin" />
                ) : (
                  t("payButton", { amount: formatKzt(amount) })
                )}
              </button>
              <button
                type="button"
                disabled={phase === "processing"}
                onClick={() => complete("failed")}
                className="mt-3 min-h-[48px] w-full rounded-2xl text-sm font-medium text-neutral-400 transition hover:text-neutral-600"
              >
                {t("simulateFail")}
              </button>
              {phase === "failed" && (
                <p role="alert" className="mt-4 text-center text-sm text-[#d93c2c]">
                  {t("failed")}
                </p>
              )}
            </>
          )}
        </div>
        <p className="mt-5 text-center text-xs leading-relaxed text-neutral-400">
          {t("sandboxNote")}
        </p>
      </div>
    </main>
  );
}
