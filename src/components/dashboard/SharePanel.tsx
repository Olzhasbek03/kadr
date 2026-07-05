"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import QRCodeLib from "qrcode";
import QrCode from "@/components/QrCode";
import { CheckIcon, CopyIcon, DownloadIcon, PrinterIcon } from "@/components/icons";

export default function SharePanel({
  joinUrl,
  eventId,
  eventName,
}: {
  joinUrl: string;
  eventId: string;
  eventName: string;
}) {
  const t = useTranslations("event");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const downloadQr = async () => {
    const dataUrl = await QRCodeLib.toDataURL(joinUrl, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#171310", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `kadr-qr-${eventName.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.png`;
    a.click();
  };

  return (
    <section className="card grid gap-7 p-6 sm:p-8 md:grid-cols-[auto_1fr]">
      <div className="flex items-start justify-center">
        <div className="rounded-2xl bg-white p-3">
          <QrCode value={joinUrl} size={168} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <p className="label-soft">{t("guestLink")}</p>
          <div className="mt-2.5 flex gap-2">
            <input
              readOnly
              value={joinUrl}
              onFocus={(e) => e.target.select()}
              aria-label={t("guestLink")}
              className="input-base flex-1 !min-h-[52px] !py-2 text-[0.95rem]"
            />
            <button
              type="button"
              onClick={copy}
              className="icon-btn shrink-0"
              aria-label={t("copyLink")}
              title={t("copyLink")}
            >
              {copied ? <CheckIcon size={18} className="text-crimson" /> : <CopyIcon size={18} />}
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink-2">{t("shareHint")}</p>
        <div className="mt-auto flex flex-wrap gap-2.5">
          <button type="button" onClick={downloadQr} className="btn-secondary !min-h-[52px]">
            <DownloadIcon size={17} /> {t("downloadQr")}
          </button>
          <Link href={`/dashboard/${eventId}/print`} className="btn btn-secondary !min-h-[52px]">
            <PrinterIcon size={17} /> {t("printCard")}
          </Link>
        </div>
      </div>
    </section>
  );
}
