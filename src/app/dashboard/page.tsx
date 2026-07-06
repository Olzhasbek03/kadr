import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { STYLE_COVER } from "@/lib/filters";
import { isShootingOpen, type EventRow } from "@/lib/types";
import {
  CameraIcon,
  ChevronRight,
  FilmIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/icons";

type EventWithCounts = EventRow & {
  guests: { count: number }[];
  media: { count: number }[];
};

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("events")
    .select("*, guests(count), media(count)")
    .order("created_at", { ascending: false });
  const events = (data ?? []) as EventWithCounts[];

  return (
    <div className="pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-soft">{t("kicker")}</p>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl">{t("title")}</h1>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary">
          <PlusIcon size={18} /> {t("newEvent")}
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card mt-12 flex flex-col items-center gap-5 px-8 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line text-accent">
            <FilmIcon size={26} />
          </span>
          <h2 className="font-display text-3xl">{t("emptyTitle")}</h2>
          <p className="max-w-sm leading-relaxed text-ink-2">{t("emptyText")}</p>
          <Link href="/dashboard/new" className="btn btn-primary mt-2">
            <PlusIcon size={18} /> {t("newEvent")}
          </Link>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-3">
          {events.map((event) => {
            const guests = event.guests[0]?.count ?? 0;
            const photos = event.media[0]?.count ?? 0;
            const live = isShootingOpen(event);
            return (
              <Link
                key={event.id}
                href={`/dashboard/${event.id}`}
                className="card group flex items-center gap-5 p-4 transition hover:bg-bg sm:p-5"
              >
                <div
                  aria-hidden
                  className="h-16 w-16 shrink-0 rounded-xl border border-line sm:h-20 sm:w-20"
                  style={{ background: STYLE_COVER[event.filter_preset] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="font-display truncate text-xl sm:text-2xl">
                      {event.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider ${
                        live ? "bg-success/15 text-success" : "bg-ink/10 text-ink-2"
                      }`}
                    >
                      {live ? t("statusLive") : t("statusEnded")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-2">
                    {formatDate(event.event_date, locale)}
                  </p>
                  <p className="mt-2 flex items-center gap-4 text-sm text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <UsersIcon size={15} /> {guests}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CameraIcon size={15} /> {photos}
                    </span>
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-ink-2 transition group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
