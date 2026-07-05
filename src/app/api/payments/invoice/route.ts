import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { config } from "@/lib/config";
import type { EventRow } from "@/lib/types";

/** POST /api/payments/invoice — start checkout for a draft event (host only). */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let eventId: string;
  try {
    ({ eventId } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!eventId) return NextResponse.json({ error: "invalid_event" }, { status: 400 });

  // RLS: the authed client only sees the host's own events.
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (event.status === "active")
    return NextResponse.json({ error: "already_active" }, { status: 400 });

  const admin = supabaseAdmin();

  if (event.price === 0) {
    await admin.from("events").update({ status: "active" }).eq("id", event.id);
    return NextResponse.json({ activated: true });
  }

  const provider = getPaymentProvider();
  const returnUrl = `${config.appUrl}/dashboard/${event.id}`;

  try {
    const invoice = await provider.createInvoice({
      eventId: event.id,
      amount: event.price,
      description: `Kormem — «${event.name}»`,
      returnUrl,
    });

    const { error } = await admin.from("payments").insert({
      event_id: event.id,
      provider: provider.id,
      external_id: invoice.externalId,
      amount: event.price,
      status: "pending",
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ paymentUrl: invoice.paymentUrl });
  } catch (err) {
    console.error("invoice:", err);
    return NextResponse.json({ error: "provider_error" }, { status: 502 });
  }
}
