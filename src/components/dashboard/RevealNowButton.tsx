"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { revealNow } from "@/app/dashboard/[eventId]/actions";
import { UnlockIcon } from "@/components/icons";

export default function RevealNowButton({ eventId }: { eventId: string }) {
  const t = useTranslations("event");
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm text-muted">{t("revealNowConfirm")}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => void (await revealNow(eventId)))}
          className="btn-accent !min-h-[48px] !px-5 text-sm"
        >
          {t("revealNowYes")}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="btn-secondary !min-h-[48px] !px-5 text-sm"
        >
          {t("revealNowNo")}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="btn-secondary !min-h-[52px]"
    >
      <UnlockIcon size={17} /> {t("revealNow")}
    </button>
  );
}
