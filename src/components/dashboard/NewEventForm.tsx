"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FILM_STYLES, FILTER_CSS, STYLE_COVER, type FilmStyle } from "@/lib/filters";
import { formatKzt } from "@/lib/config";
import type { RevealMode } from "@/lib/types";
import { ArrowLeft, ArrowRight, Mark } from "@/components/icons";

const SHOT_OPTIONS = [5, 10, 15, 20, 25, 30];

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

export default function NewEventForm({
  priceKzt,
  freeGuestLimit,
}: {
  priceKzt: number;
  freeGuestLimit: number;
}) {
  const t = useTranslations("create");
  const tc = useTranslations("common");
  const router = useRouter();

  const start = useMemo(defaultStart, []);
  const end = useMemo(() => new Date(start.getTime() + 5.5 * 3600_000), [start]);

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(toLocalInput(start));
  const [endTime, setEndTime] = useState(toLocalInput(end));
  const [shots, setShots] = useState(10);
  const [maxGuests, setMaxGuests] = useState<string>("");
  const [revealMode, setRevealMode] = useState<RevealMode>("event_end");
  const [revealAt, setRevealAt] = useState("");
  const [filterPreset, setFilterPreset] = useState<FilmStyle>("warm");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guestsNum = maxGuests.trim() === "" ? null : Math.round(Number(maxGuests));
  const price =
    guestsNum !== null && Number.isFinite(guestsNum) && guestsNum <= freeGuestLimit
      ? 0
      : priceKzt;

  const valid =
    name.trim().length > 0 &&
    eventDate &&
    endTime &&
    new Date(endTime) > new Date(eventDate) &&
    (revealMode !== "custom" || revealAt) &&
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
          shotsPerGuest: shots,
          maxGuests: guestsNum,
          revealMode,
          revealAt: revealMode === "custom" ? new Date(revealAt).toISOString() : null,
          filterPreset,
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

  const revealOptions: { id: RevealMode; title: string; hint: string }[] = [
    { id: "instant", title: t("revealInstant"), hint: t("revealInstantHint") },
    { id: "event_end", title: t("revealEventEnd"), hint: t("revealEventEndHint") },
    { id: "custom", title: t("revealCustom"), hint: t("revealCustomHint") },
  ];

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl pt-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft size={16} /> {tc("back")}
      </Link>
      <h1 className="font-serif-display mt-4 text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("subtitle")}</p>

      {/* name */}
      <section className="mt-12">
        <label htmlFor="name" className="microlabel">
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
          <label htmlFor="start" className="microlabel">
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
          <label htmlFor="end" className="microlabel">
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

      {/* shots */}
      <section className="mt-10">
        <p className="microlabel">{t("shotsLabel")}</p>
        <p className="mt-1.5 text-sm text-muted">{t("shotsHint")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {SHOT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setShots(n)}
              data-selected={shots === n}
              className="option-card py-4 text-lg"
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      {/* max guests */}
      <section className="mt-10">
        <label htmlFor="maxGuests" className="microlabel">
          {t("guestsLabel")}
        </label>
        <p className="mt-1.5 text-sm text-muted">{t("guestsHint", { count: freeGuestLimit })}</p>
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

      {/* reveal */}
      <section className="mt-10">
        <p className="microlabel">{t("revealLabel")}</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {revealOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRevealMode(opt.id)}
              data-selected={revealMode === opt.id}
              className="option-card !items-start flex-col gap-1.5 px-4 py-4 text-left"
            >
              <span className="font-medium">{opt.title}</span>
              <span className="text-[0.82rem] font-normal leading-snug text-muted">
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
        {revealMode === "custom" && (
          <input
            type="datetime-local"
            value={revealAt}
            onChange={(e) => setRevealAt(e.target.value)}
            required
            aria-label={t("revealCustom")}
            className="input-base mt-3"
          />
        )}
      </section>

      {/* film style */}
      <section className="mt-10">
        <p className="microlabel">{t("styleLabel")}</p>
        <p className="mt-1.5 text-sm text-muted">{t("styleHint")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {FILM_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setFilterPreset(style)}
              data-selected={filterPreset === style}
              className="option-card flex-col gap-0 overflow-hidden !p-0 text-left"
            >
              <span
                aria-hidden
                className="block h-16 w-full"
                style={{
                  background: STYLE_COVER.original,
                  filter: FILTER_CSS[style],
                }}
              />
              <span className="block w-full px-3.5 py-2.5 text-[0.92rem]">
                {t(`styles.${style}`)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* price + submit */}
      <section className="card mt-12 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="microlabel">{t("priceLabel")}</p>
          <p className="stat-numeral mt-1 text-3xl">
            {price === 0 ? t("priceFree") : formatKzt(price)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {price === 0 ? t("priceFreeHint") : t("pricePaidHint")}
          </p>
        </div>
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
