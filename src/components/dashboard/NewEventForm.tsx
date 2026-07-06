"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FILM_STYLES } from "@/lib/filters";
import { COVER_TEMPLATES, type CoverTemplate } from "@/lib/covers";
import { UNLIMITED_SHOTS } from "@/lib/types";
import { ArrowLeft, ArrowRight, CameraIcon, Mark } from "@/components/icons";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + (((6 - d.getDay() + 7) % 7) || 7)); // next Saturday
  d.setHours(18, 0, 0, 0);
  return d;
}

export default function NewEventForm({ defaultMaxGuests }: { defaultMaxGuests: number }) {
  const t = useTranslations("create");
  const tc = useTranslations("common");
  const router = useRouter();

  const start = useMemo(defaultStart, []);
  const end = useMemo(() => new Date(start.getTime() + 5.5 * 3600_000), [start]);

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(toLocalInput(start));
  const [endTime, setEndTime] = useState(toLocalInput(end));
  const [maxGuests, setMaxGuests] = useState<string>(String(defaultMaxGuests));
  const [coverTemplate, setCoverTemplate] = useState<CoverTemplate>("classic");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guestsNum = maxGuests.trim() === "" ? null : Math.round(Number(maxGuests));

  const valid =
    name.trim().length > 0 &&
    eventDate &&
    endTime &&
    new Date(endTime) > new Date(eventDate) &&
    (guestsNum === null || (Number.isFinite(guestsNum) && guestsNum >= 1));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          eventDate: new Date(eventDate).toISOString(),
          endTime: new Date(endTime).toISOString(),
          // Unlimited photos; the gallery is live from the first shot.
          shotsPerGuest: UNLIMITED_SHOTS,
          maxGuests: guestsNum,
          revealMode: "instant",
          revealAt: null,
          // Guests still get all three styles in their camera; the host no
          // longer configures a starting stock. Default: no filter.
          filterPreset: "original",
          allowedStyles: [...FILM_STYLES],
          coverTemplate,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { event } = await res.json();
      router.push(`/dashboard/${event.id}`);
    } catch {
      setError(tc("error"));
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl pt-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-ink-2 transition hover:text-ink"
      >
        <ArrowLeft size={16} /> {tc("back")}
      </Link>
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 text-ink-2">{t("subtitle")}</p>

      {/* name */}
      <section className="mt-12">
        <label htmlFor="name" className="label-soft">
          {t("nameLabel")}
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          placeholder={t("namePlaceholder")}
          className="input-base mt-3 text-lg"
        />
      </section>

      {/* date & time */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start" className="label-soft">
            {t("startLabel")}
          </label>
          <input
            id="start"
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="input-base mt-3"
          />
        </div>
        <div>
          <label htmlFor="end" className="label-soft">
            {t("endLabel")}
          </label>
          <input
            id="end"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="input-base mt-3"
          />
          {endTime && eventDate && new Date(endTime) <= new Date(eventDate) && (
            <p className="mt-2 text-sm text-danger">{t("endAfterStart")}</p>
          )}
        </div>
      </section>

      {/* live-gallery note: every shot appears immediately, no reveal timer */}
      <section className="mt-8 flex items-start gap-3 rounded-[12px] border border-line bg-surface p-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-accent">
          <CameraIcon size={17} />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">{t("liveTitle")}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{t("liveText")}</p>
        </div>
      </section>

      {/* invitation card: the first thing guests see after the scan */}
      <section className="mt-10">
        <p className="label-soft">{t("coverLabel")}</p>
        <p className="mt-1.5 text-sm text-ink-2">{t("coverHint")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {COVER_TEMPLATES.map((tplId) => {
            const dark = tplId !== "classic";
            const surface =
              tplId === "botanical" ? "#28331f" : tplId === "noir" ? "#151512" : undefined;
            const previewName = name.trim() || t("namePlaceholder");
            return (
              <button
                key={tplId}
                type="button"
                onClick={() => setCoverTemplate(tplId)}
                aria-pressed={coverTemplate === tplId}
                data-selected={coverTemplate === tplId}
                className="option-card flex-col gap-0 overflow-hidden !p-0 text-left"
              >
                {/* live miniature of the guest join screen */}
                <span
                  aria-hidden
                  className={`flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 px-2 text-center ${
                    dark ? "text-[#faf8f5]" : "text-ink"
                  }`}
                  style={{ background: surface ?? "var(--bg)" }}
                >
                  <span
                    className={`flex w-full flex-1 flex-col items-center justify-center gap-1 rounded-[6px] px-1 ${
                      tplId === "botanical" ? "m-1.5 border border-[#faf8f5]/25" : ""
                    }`}
                  >
                    <span className={`text-[7px] ${dark ? "opacity-60" : "text-ink-2"}`}>
                      {t("coverPreviewKicker")}
                    </span>
                    <span className="font-display line-clamp-2 max-w-full break-words px-1 text-[11px] leading-tight">
                      {previewName}
                    </span>
                    <span
                      className={`mt-0.5 flex items-center gap-1 text-[6px] ${
                        dark ? "opacity-60" : "text-ink-2"
                      }`}
                    >
                      <CameraIcon size={7} /> {t("coverPreviewShots")}
                    </span>
                    <span
                      className={`mt-1.5 w-3/4 rounded-full px-1 py-1 text-[6px] font-medium ${
                        dark
                          ? "bg-[#faf8f5]/85 text-[#171615]"
                          : "border border-[#171615] bg-[#d6d5d4] text-[#171615]"
                      }`}
                    >
                      {t("coverPreviewCta")}
                    </span>
                  </span>
                </span>
                <span className="block w-full border-t border-line px-3 py-2.5 text-[0.9rem]">
                  {t(`covers.${tplId}`)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* max guests */}
      <section className="mt-10">
        <label htmlFor="maxGuests" className="label-soft">
          {t("guestsLabel")}
        </label>
        <p className="mt-1.5 text-sm text-ink-2">{t("guestsHint")}</p>
        <input
          id="maxGuests"
          type="number"
          min={1}
          max={2000}
          inputMode="numeric"
          value={maxGuests}
          onChange={(e) => setMaxGuests(e.target.value)}
          placeholder={t("guestsPlaceholder")}
          className="input-base mt-4"
        />
      </section>

      {/* submit */}
      <section className="mt-12 flex justify-end">
        <button type="submit" disabled={!valid || pending} className="btn-primary shrink-0">
          {pending ? (
            <Mark size={18} className="animate-spin" />
          ) : (
            <>
              {t("submit")} <ArrowRight size={18} />
            </>
          )}
        </button>
      </section>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-center text-danger"
        >
          {error}
        </p>
      )}
    </form>
  );
}
