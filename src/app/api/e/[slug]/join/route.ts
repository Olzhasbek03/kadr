import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEventBySlug } from "@/lib/events";
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE } from "@/lib/device";
import { allowanceFor, type GuestRow } from "@/lib/types";

/**
 * POST /api/e/[slug]/join — register this device as a guest (no auth).
 * Idempotent per device: rejoining returns the existing guest.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== "active") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let displayName: string | null = null;
  try {
    const body = await req.json();
    if (typeof body.name === "string") {
      displayName = body.name.trim().slice(0, 80) || null;
    }
  } catch {
    // empty body is fine
  }

  const deviceToken = req.cookies.get(DEVICE_COOKIE)?.value ?? randomUUID();
  const db = supabaseAdmin();

  // Existing guest for this device?
  const { data: existing } = await db
    .from("guests")
    .select("*")
    .eq("event_id", event.id)
    .eq("device_token", deviceToken)
    .maybeSingle<GuestRow>();

  let guest = existing;

  if (!guest) {
    // Capacity check applies only to brand-new guests.
    if (event.max_guests !== null) {
      const { count } = await db
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id);
      if ((count ?? 0) >= event.max_guests) {
        return NextResponse.json({ error: "event_full" }, { status: 403 });
      }
    }
    const { data: created, error } = await db
      .from("guests")
      .insert({
        event_id: event.id,
        device_token: deviceToken,
        display_name: displayName,
      })
      .select("*")
      .single<GuestRow>();
    if (error) {
      // Unique-violation race: another tab joined first — fetch it.
      const { data: raced } = await db
        .from("guests")
        .select("*")
        .eq("event_id", event.id)
        .eq("device_token", deviceToken)
        .maybeSingle<GuestRow>();
      if (!raced) {
        console.error("join:", error.message);
        return NextResponse.json({ error: "db_error" }, { status: 500 });
      }
      guest = raced;
    } else {
      guest = created;
    }
  } else if (displayName && !guest.display_name) {
    await db.from("guests").update({ display_name: displayName }).eq("id", guest.id);
    guest = { ...guest, display_name: displayName };
  }

  const res = NextResponse.json({
    guest: {
      id: guest.id,
      displayName: guest.display_name,
      shotsUsed: guest.shots_used,
    },
    ...allowanceFor(event, guest),
  });
  res.cookies.set(DEVICE_COOKIE, deviceToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEVICE_COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
