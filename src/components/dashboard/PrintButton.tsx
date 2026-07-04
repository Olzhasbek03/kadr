"use client";

import { PrinterIcon } from "@/components/icons";

export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-neutral-900 px-6 font-medium text-white"
    >
      <PrinterIcon size={17} /> {label}
    </button>
  );
}
