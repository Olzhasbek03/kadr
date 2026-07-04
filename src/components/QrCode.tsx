"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCode({ value, size = 240 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [value, size]);

  if (!dataUrl) return <div style={{ width: size, height: size }} className="rounded-xl bg-stone-100" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="QR" width={size} height={size} className="rounded-xl" />;
}
