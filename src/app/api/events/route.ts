import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { computeRevealAt, newSlug } from "@/lib/events";
import { FILM_STYLES, isFilmStyle } from "@/lib/filters";
import { isCoverTemplate } from "@/lib/covers";
import type { RevealMode } from "@/lib/types";

const REVEAL_MODES: RevealMode[] = ["instant", "event_end", "custom"];

interface CreateEventBody {
  name?: string;
  eventDate?: string;
  endTime?: string;
  shotsPerGuest?: number;
  maxGuests?: number | null;
  revealMode?: string;
  revealAt?: string | null;
  filterPreset?: string;
  /** Styles guests may use; omitted or full list means all. */
  allowedStyles?: string[];
  /** Invitation card design; defaults to "classic". */
  coverTemplate?: string;
}

/** POST /api/events — create an event (signed-in host). */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CreateEventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const eventDate = new Date(body.eventDate ?? "");
  const endTime = new Date(body.endTime ?? "");
  const shots = Math.round(Number(body.shotsPerGuest));
  const maxGuests =
    body.maxGuests === null || body.maxGuests === undefined
      ? null
      : Math.round(Number(body.maxGuests));
  const revealMode = body.revealMode as RevealMode;
  const customReveal = body.revealAt ? new Date(body.revealAt) : null;
  const filterPreset = body.filterPreset ?? "original";

  if (name.length < 1 || name.length > 120)
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  if (isNaN(eventDate.getTime()) || isNaN(endTime.getTime()) || endTime <= eventDate)
    return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
  // Photos are unlimited (UNLIMITED_SHOTS sentinel); still bound the value.
  if (!Number.isFinite(shots) || shots < 1 || shots > 100_000)
    return NextResponse.json({ error: "invalid_shots" }, { status: 400 });
  if (maxGuests !== null && (!Number.isFinite(maxGuests) || maxGuests < 1 || maxGuests > 2000))
    return NextResponse.json({ error: "invalid_max_guests" }, { status: 400 });
  if (!REVEAL_MODES.includes(revealMode))
    return NextResponse.json({ error: "invalid_reveal_mode" }, { status: 400 });
  if (revealMode === "custom" && (!customReveal || isNaN(customReveal.getTime())))
    return NextResponse.json({ error: "invalid_reveal_at" }, { status: 400 });
  if (!isFilmStyle(filterPreset))
    return NextResponse.json({ error: "invalid_filter" }, { status: 400 });
  const coverTemplate = body.coverTemplate ?? "classic";
  if (!isCoverTemplate(coverTemplate))
    return NextResponse.json({ error: "invalid_cover_template" }, { status: 400 });

  // Style restriction: every entry must be a real style, the preset must be
  // usable, and restricting to the full list is stored as "no restriction".
  let allowedStyles: string[] | null = null;
  if (Array.isArray(body.allowedStyles)) {
    const unique = [...new Set(body.allowedStyles)];
    if (unique.length === 0 || !unique.every(isFilmStyle))
      return NextResponse.json({ error: "invalid_allowed_styles" }, { status: 400 });
    if (!unique.includes(filterPreset))
      return NextResponse.json({ error: "preset_not_allowed" }, { status: 400 });
    allowedStyles = unique.length === FILM_STYLES.length ? null : unique;
  }

  const revealAt = computeRevealAt(revealMode, endTime, customReveal);

  const row = {
    host_user_id: user.id,
    name,
    slug: newSlug(),
    event_date: eventDate.toISOString(),
    end_time: endTime.toISOString(),
    shots_per_guest: shots,
    max_guests: maxGuests,
    reveal_mode: revealMode,
    reveal_at: revealAt.toISOString(),
    filter_preset: filterPreset,
    allowed_styles: allowedStyles,
    cover_template: coverTemplate,
    status: "active",
  };

  // Insert with graceful degradation: if the Supabase project is a migration
  // or two behind, drop/clamp only the field the DB rejects and retry, so an
  // event still gets created instead of failing outright.
  const attempt: Partial<typeof row> = { ...row };
  let data: { id: string; slug: string; status: string } | null = null;
  let error: { message: string } | null = null;

  for (let i = 0; i < 4; i++) {
    ({ data, error } = await supabase
      .from("events")
      .insert(attempt)
      .select("id, slug, status")
      .single());
    if (!error) break;

    // cover_template migration not run yet → join page falls back to classic.
    if (/cover_template/.test(error.message) && "cover_template" in attempt) {
      delete attempt.cover_template;
      continue;
    }
    // unlimited-shots migration not run yet → cap at the old 100 ceiling.
    if (
      /shots_per_guest/.test(error.message) &&
      (attempt.shots_per_guest ?? 0) > 100
    ) {
      attempt.shots_per_guest = 100;
      continue;
    }
    break;
  }

  if (error) {
    console.error("create event:", error.message);
    // Surface the real DB reason (RLS, missing column, missing table…) so a
    // misconfigured Supabase project is diagnosable instead of a mute 500.
    return NextResponse.json(
      { error: "db_error", detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ event: data }, { status: 201 });
}
