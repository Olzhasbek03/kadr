import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { supabaseServer } from "@/lib/supabase/server";
import { MEDIA_BUCKET, SIGNED_URL_TTL, supabaseAdmin } from "@/lib/supabase/admin";
import { config } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { STYLE_COVER } from "@/lib/filters";
import { isShootingOpen, type EventRow, type GalleryItem, type MediaType } from "@/lib/types";
import SharePanel from "@/components/dashboard/SharePanel";
import HostGallery from "@/components/dashboard/HostGallery";
import {
  ArrowLeft,
  CameraIcon,
  ChevronRight,
  MicIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/icons";

interface MediaRecord {
  id: string;
  media_type: MediaType;
  storage_path: string;
  thumb_path: string | null;
  mime_type: string;
  duration_s: number | null;
  filter: string;
  created_at: string;
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
      .select(
        "id, media_type, storage_path, thumb_path, mime_type, duration_s, filter, created_at, guests(display_name)"
      )
      .eq("event_id", event.id)
      .order("created_at", { ascending: true })
      .returns<MediaRecord[]>(),
  ]);

  // Mint signed URLs with the service key (bucket is private).
  const rows = mediaRows ?? [];
  let items: GalleryItem[] = [];
  if (rows.length > 0) {
    const storage = supabaseAdmin().storage.from(MEDIA_BUCKET);
    const paths = rows.flatMap((m) =>
      m.thumb_path ? [m.storage_path, m.thumb_path] : [m.storage_path]
    );
    const [{ data: signed }, { data: signedDl }] = await Promise.all([
      storage.createSignedUrls(paths, SIGNED_URL_TTL),
      storage.createSignedUrls(
        rows.map((m) => m.storage_path),
        SIGNED_URL_TTL,
        { download: true }
      ),
    ]);
    const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    const dlFor = new Map((signedDl ?? []).map((s) => [s.path, s.signedUrl]));
    items = rows.map((m) => ({
      id: m.id,
      type: m.media_type,
      url: urlFor.get(m.storage_path) ?? null,
      thumbUrl: m.thumb_path ? (urlFor.get(m.thumb_path) ?? null) : null,
      downloadUrl: dlFor.get(m.storage_path) ?? null,
      mimeType: m.mime_type,
      durationS: m.duration_s === null ? null : Number(m.duration_s),
      filter: m.filter,
      guestName: m.guests?.display_name ?? null,
      mine: false,
      createdAt: m.created_at,
    }));
  }

  const photoCount = rows.filter((m) => m.media_type === "photo").length;
  const videoCount = rows.filter((m) => m.media_type === "video").length;
  const voiceCount = rows.filter((m) => m.media_type === "audio").length;

  const live = isShootingOpen(event);
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
                live ? "bg-success/15 text-success" : "bg-ink/10 text-ink-2"
              }`}
            >
              {live ? t("statusLive") : t("statusEnded")}
            </span>
          </div>
          <p className="mt-2 text-ink-2">{formatDateTime(event.event_date, locale)}</p>
        </div>
      </div>

      {/* stats */}
      <div className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
        {[
          [guestCount ?? 0, t("guests"), <UsersIcon key="u" size={15} />],
          [photoCount, t("photos"), <CameraIcon key="c" size={15} />],
          [videoCount, t("videos"), <VideoIcon key="v" size={15} />],
          [voiceCount, t("voiceWishes"), <MicIcon key="m" size={15} />],
        ].map(([num, label, icon], i) => (
          <div key={i}>
            <div className="numeral flex items-center gap-2.5 text-4xl">
              {num as number}
              <span className="text-ink-2">{icon}</span>
            </div>
            <div className="label-soft mt-1.5">{label as string}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-6">
        <SharePanel joinUrl={joinUrl} eventId={event.id} eventName={event.name} />

        {/* guest list */}
        <Link
          href={`/dashboard/${event.id}/guests`}
          className="card group flex items-center justify-between p-5"
        >
          <span className="flex items-center gap-3">
            <UsersIcon size={18} className="text-ink-2" />
            <span className="font-medium">{t("guestListLink")}</span>
            <span className="numeral text-ink-2">{guestCount ?? 0}</span>
          </span>
          <ChevronRight
            size={18}
            className="text-ink-2 transition group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </Link>

        {/* live gallery: everything guests shoot appears here and in the
            shared gallery immediately */}
        <section className="card flex items-start gap-3 p-6 sm:p-8">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-accent">
            {live ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
            ) : (
              <CameraIcon size={16} />
            )}
          </span>
          <div>
            <p className="font-medium">{live ? t("liveNow") : t("eventEnded")}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {live ? t("liveNowText") : t("eventEndedText")}
            </p>
            <Link
              href={`/e/${event.slug}/gallery`}
              className="btn-secondary mt-4 !min-h-[46px] text-sm"
            >
              {t("openSharedGallery")} <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        {/* gallery */}
        <section>
          <p className="label-soft">{t("gallerySection")}</p>
          <HostGallery items={items} eventId={event.id} eventSlug={event.slug} />
        </section>
      </div>
    </div>
  );
}
