import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import type { EventRow } from "@/lib/types";
import {
  ArrowLeft,
  CameraIcon,
  MicIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/icons";

interface GuestListRow {
  id: string;
  display_name: string | null;
  shots_used: number;
  video_count: number;
  audio_count: number;
  created_at: string;
}

/** Who joined and how much each guest shot — the host's participation view. */
export default async function GuestListPage(ctx: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await ctx.params;
  const t = await getTranslations("guestList");
  const locale = await getLocale();
  const supabase = await supabaseServer();

  // RLS: only the owner can read the event and its guests.
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();
  if (!event) notFound();

  const { data } = await supabase
    .from("guests")
    .select("id, display_name, shots_used, video_count, audio_count, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
    .returns<GuestListRow[]>();
  const guests = data ?? [];

  return (
    <div className="pt-10">
      <Link
        href={`/dashboard/${eventId}`}
        className="inline-flex items-center gap-2 text-sm text-ink-2 transition hover:text-ink"
      >
        <ArrowLeft size={16} /> {t("backToEvent")}
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-soft">{event.name}</p>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl">{t("title")}</h1>
        </div>
        <p className="flex items-center gap-2 text-ink-2">
          <UsersIcon size={16} />
          <span className="numeral text-lg">{guests.length}</span>
          {event.max_guests !== null && (
            <span className="text-sm">/ {event.max_guests}</span>
          )}
        </p>
      </div>

      {guests.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center gap-4 px-6 py-16 text-center">
          <UsersIcon size={28} className="text-ink-2" />
          <p className="max-w-sm leading-relaxed text-ink-2">{t("empty")}</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-2">
          {guests.map((guest) => {
            const photos = guest.shots_used - guest.video_count - guest.audio_count;
            return (
              <div key={guest.id} className="card flex items-center gap-4 p-4 sm:p-5">
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-crimson/10 font-medium text-crimson"
                >
                  {(guest.display_name ?? "•").slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {guest.display_name ?? t("anonymous")}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-2">
                    {t("joined", { time: formatDateTime(guest.created_at, locale) })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm text-ink-2">
                  <span className="flex items-center gap-1.5" title={t("photos")}>
                    <CameraIcon size={15} />
                    <span className="numeral">{Math.max(0, photos)}</span>
                  </span>
                  <span className="flex items-center gap-1.5" title={t("videos")}>
                    <VideoIcon size={15} />
                    <span className="numeral">{guest.video_count}</span>
                  </span>
                  <span className="flex items-center gap-1.5" title={t("voice")}>
                    <MicIcon size={15} />
                    <span className="numeral">{guest.audio_count}</span>
                  </span>
                  <span className="numeral hidden rounded-full bg-bg px-3 py-1 sm:block">
                    {guest.shots_used} / {event.shots_per_guest}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
