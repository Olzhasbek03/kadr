import { FILM_STYLES, isFilmStyle, type FilmStyle } from "@/lib/filters";
import { isCoverTemplate, type CoverTemplate } from "@/lib/covers";

export type RevealMode = "instant" | "event_end" | "custom";
/** Every event is live from creation; hosts may end one early. */
export type EventStatus = "active" | "ended";
export type MediaType = "photo" | "video" | "audio";

export interface EventRow {
  id: string;
  host_user_id: string;
  name: string;
  slug: string;
  event_date: string;
  end_time: string;
  shots_per_guest: number;
  max_guests: number | null;
  reveal_mode: RevealMode;
  reveal_at: string;
  filter_preset: FilmStyle;
  /** Styles guests may shoot with; null means all. */
  allowed_styles: string[] | null;
  cover_image_url: string | null;
  /** Invitation card design; may be absent until the migration runs. */
  cover_template?: string | null;
  status: EventStatus;
  created_at: string;
}

export interface GuestRow {
  id: string;
  event_id: string;
  device_token: string;
  display_name: string | null;
  shots_used: number;
  video_count: number;
  audio_count: number;
  created_at: string;
}

export interface MediaRow {
  id: string;
  event_id: string;
  guest_id: string;
  media_type: MediaType;
  storage_path: string;
  thumb_path: string | null;
  mime_type: string;
  size_bytes: number;
  duration_s: number | null;
  filter: string;
  created_at: string;
}

/** Per-guest sub-caps inside the shared shot budget (cost control:
 *  a 10s clip is ~7× a compressed photo; see docs in the migration). */
export const VIDEO_CAP_PER_GUEST = 3;
export const AUDIO_CAP_PER_GUEST = 1;
export const VIDEO_MAX_SECONDS = 10;
export const AUDIO_MAX_SECONDS = 60;

/** Event fields safe to expose to guests. */
export interface PublicEvent {
  slug: string;
  name: string;
  eventDate: string;
  endTime: string;
  shotsPerGuest: number;
  revealAt: string;
  filterPreset: FilmStyle;
  /** Effective list of styles the guest camera offers. */
  allowedStyles: FilmStyle[];
  /** Invitation card design shown on the join page. */
  coverTemplate: CoverTemplate;
  status: EventStatus;
}

/** Resolve the host's style restriction to a concrete, valid list. */
export function effectiveStyles(e: Pick<EventRow, "allowed_styles">): FilmStyle[] {
  const allowed = (e.allowed_styles ?? []).filter(isFilmStyle);
  return allowed.length > 0 ? allowed : [...FILM_STYLES];
}

export function toPublicEvent(e: EventRow): PublicEvent {
  return {
    slug: e.slug,
    name: e.name,
    eventDate: e.event_date,
    endTime: e.end_time,
    shotsPerGuest: e.shots_per_guest,
    revealAt: e.reveal_at,
    filterPreset: e.filter_preset,
    allowedStyles: effectiveStyles(e),
    coverTemplate: isCoverTemplate(e.cover_template) ? e.cover_template : "classic",
    status: e.status,
  };
}

/** What a guest may still capture, derived from their row + the event. */
export interface GuestAllowance {
  shotsLeft: number;
  videosLeft: number;
  audiosLeft: number;
}

export function allowanceFor(event: Pick<EventRow, "shots_per_guest">, guest: GuestRow): GuestAllowance {
  const shotsLeft = Math.max(0, event.shots_per_guest - guest.shots_used);
  return {
    shotsLeft,
    videosLeft: Math.min(shotsLeft, Math.max(0, VIDEO_CAP_PER_GUEST - guest.video_count)),
    audiosLeft: Math.min(shotsLeft, Math.max(0, AUDIO_CAP_PER_GUEST - guest.audio_count)),
  };
}

/** One gallery entry as served to clients (guest gallery + host dashboard). */
export interface GalleryItem {
  id: string;
  type: MediaType;
  url: string | null;
  /** photo thumbnail or video poster; null for audio */
  thumbUrl: string | null;
  /** same object with content-disposition, for real downloads */
  downloadUrl: string | null;
  mimeType: string;
  durationS: number | null;
  filter: string;
  guestName: string | null;
  mine: boolean;
  createdAt: string;
}

export function isRevealed(revealAt: string, now = new Date()): boolean {
  return now.getTime() >= new Date(revealAt).getTime();
}

/** Uploads are allowed while the event is active and shooting hasn't ended
 *  (30 min grace so the last dance still makes it onto the film). */
export function isShootingOpen(
  e: Pick<EventRow, "status" | "end_time">,
  now = new Date()
): boolean {
  const grace = 30 * 60 * 1000;
  return e.status === "active" && now.getTime() <= new Date(e.end_time).getTime() + grace;
}
