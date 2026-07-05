import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { supabaseServer } from "@/lib/supabase/server";
import { MEDIA_BUCKET, SIGNED_URL_TTL, supabaseAdmin } from "@/lib/supabase/admin";
import { config } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { STYLE_COVER } from "@/lib/filters";
import { isRevealed, type EventRow } from "@/lib/types";
import SharePanel from "@/components/dashboard/SharePanel";
import Countdown from "@/components/dashboard/Countdown";
import RevealNowButton from "@/components/dashboard/RevealNowButton";
import HostGallery, { type GalleryPhoto } from "@/components/dashboard/HostGallery";
import { ArrowLeft, CameraIcon, ClockIcon, UsersIcon } from "@/components/icons";

interface MediaRecord {
  id: string;
  media_type: "photo" | "video" | "audio";
  storage_path: string;
  thumb_path: string | null;
  filter: string;
  guests: { display_name: string | null } | null;
}

export default async function EventPage(ctx: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await ctx.params;
  const t = await getTranslations("event");
  const locale = await getLocale();
  const supabase = await supabaseServer();

  // RLS: only the owner can read this row.
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();
  if (!event) notFound();

  const [{ count: guestCount }, { data: mediaRows }] = await Promise.all([
    supabase.from("guests").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    supabase
      .from("media")
      .select("id, media_type, storage_path, thumb_path, filter, guests(display_name)")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true })
      .returns<MediaRecord[]>(),
  ]);

  // Mint signed URLs with the service key (bucket is private).
  const rows = mediaRows ?? [];
  let photos: GalleryPhoto[] = [];
  if (rows.length > 0) {
    const storage = supabaseAdmin().storage.from(MEDIA_BUCKET);
    const paths = rows.flatMap((p) => [p.storage_path, p.thumb_path ?? p.storage_path]);
    const { data: signed } = await storage.createSignedUrls(paths, SIGNED_URL_TTL);
    const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    photos = rows.map((p) => ({
      id: p.id,
      url: urlFor.get(p.storage_path) ?? null,
      thumbUrl: urlFor.get(p.thumb_path ?? p.storage_path) ?? null,
      filter: p.filter,
      guestName: p.guests?.display_name ?? null,
    }));
  }

  const revealed = isRevealed(event.reveal_at);
  const joinUrl = `${config.appUrl}/e/${event.slug}`;

  return (
    <div className="pt-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-ink-2 transition hover:text-ink"
      >
        <ArrowLeft size={16} /> {t("backToEvents")}
      </Link>

      {/* header */}
      <div className="mt-5 flex items-center gap-5">
        <div
          aria-hidden
          className="hidden h-20 w-20 shrink-0 rounded-2xl border border-line sm:block"
          style={{ background: STYLE_COVER[event.filter_preset] }}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              {event.name}
            </h1>
            <span
              className={`rounded-full px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider ${
                revealed ? "bg-crimson/15 text-crimson" : "bg-success/15 text-success"
              }`}
            >
              {revealed ? t("statusRevealed") : t("statusActive")}
            </span>
          </div>
          <p className="mt-2 text-ink-2">{formatDateTime(event.event_date, locale)}</p>
        </div>
      </div>

      {/* stats */}
      <div className="mt-10 flex gap-12">
        {[
          [guestCount ?? 0, t("guests"), <UsersIcon key="u" size={15} />],
          [photos.length, t("photos"), <CameraIcon key="c" size={15} />],
          [event.shots_per_guest, t("shotsPerGuest"), <ClockIcon key="s" size={15} />],
        ].map(([num, label], i) => (
          <div key={i}>
            <div className="numeral text-4xl">{num as number}</div>
            <div className="label-soft mt-1.5">{label as string}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-6">
        <SharePanel joinUrl={joinUrl} eventId={event.id} eventName={event.name} />

        {/* reveal */}
        <section className="card p-6 sm:p-8">
          <p className="label-soft">{t("revealSection")}</p>
          {revealed ? (
            <p className="mt-4 flex items-center gap-2.5 text-lg">
              <span className="h-2 w-2 rounded-full bg-crimson" />
              {t("revealedSince", { time: formatDateTime(event.reveal_at, locale) })}
            </p>
          ) : (
            <>
              <div className="mt-7">
                <Countdown target={event.reveal_at} refreshOnZero />
              </div>
              <p className="mt-6 text-center text-sm text-ink-2">
                {t("revealScheduled", { time: formatDateTime(event.reveal_at, locale) })}
              </p>
              <div className="mt-6 flex justify-center">
                <RevealNowButton eventId={event.id} />
              </div>
            </>
          )}
        </section>

        {/* gallery */}
        <section>
          <p className="label-soft">
            {t("gallerySection")}
            {!revealed && photos.length > 0 && (
              <span className="ml-2 normal-case tracking-normal text-ink-2">
                — {t("hostOnlyNote")}
              </span>
            )}
          </p>
          <HostGallery photos={photos} eventName={event.name} />
        </section>
      </div>
    </div>
  );
}
