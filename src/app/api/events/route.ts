import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { computeRevealAt, newSlug } from "@/lib/events";
import { priceForEvent } from "@/lib/config";
import { isFilmStyle } from "@/lib/filters";
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
  if (!Number.isFinite(shots) || shots < 1 || shots > 100)
    return NextResponse.json({ error: "invalid_shots" }, { status: 400 });
  if (maxGuests !== null && (!Number.isFinite(maxGuests) || maxGuests < 1 || maxGuests > 2000))
    return NextResponse.json({ error: "invalid_max_guests" }, { status: 400 });
  if (!REVEAL_MODES.includes(revealMode))
    return NextResponse.json({ error: "invalid_reveal_mode" }, { status: 400 });
  if (revealMode === "custom" && (!customReveal || isNaN(customReveal.getTime())))
    return NextResponse.json({ error: "invalid_reveal_at" }, { status: 400 });
  if (!isFilmStyle(filterPreset))
    return NextResponse.json({ error: "invalid_filter" }, { status: 400 });

  const price = priceForEvent(maxGuests);
  const revealAt = computeRevealAt(revealMode, endTime, customReveal);

  const { data, error } = await supabase
    .from("events")
    .insert({
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
      // Free tier activates instantly; paid events wait for the webhook.
      status: price === 0 ? "active" : "draft",
      price,
    })
    .select("id, slug, status, price")
    .single();

  if (error) {
    console.error("create event:", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ event: data }, { status: 201 });
}
