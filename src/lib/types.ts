import type { FilmStyle } from "@/lib/filters";

export type RevealMode = "instant" | "event_end" | "custom";
export type EventStatus = "draft" | "active";

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
  cover_image_url: string | null;
  status: EventStatus;
  price: number;
  created_at: string;
}

export interface GuestRow {
  id: string;
  event_id: string;
  device_token: string;
  display_name: string | null;
  shots_used: number;
  created_at: string;
}

export interface PhotoRow {
  id: string;
  event_id: string;
  guest_id: string;
  original_path: string;
  thumb_path: string | null;
  filter: string;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  event_id: string;
  provider: string;
  external_id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
}

/** Event fields safe to expose to guests. */
export interface PublicEvent {
  slug: string;
  name: string;
  eventDate: string;
  endTime: string;
  shotsPerGuest: number;
  revealAt: string;
  filterPreset: FilmStyle;
  status: EventStatus;
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
    status: e.status,
  };
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
