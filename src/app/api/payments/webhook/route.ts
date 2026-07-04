import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import type { PaymentRow } from "@/lib/types";

/**
 * POST /api/payments/webhook — provider callback.
 * Verifies the signature, records the status, activates the event on "paid".
 * Idempotent: replaying a processed webhook is a no-op.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = getPaymentProvider();

  const event = await provider.verifyWebhook(rawBody, req.headers);
  if (!event) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: payment } = await db
    .from("payments")
    .select("*")
    .eq("provider", provider.id)
    .eq("external_id", event.externalId)
    .maybeSingle<PaymentRow>();
  if (!payment) {
    return NextResponse.json({ error: "unknown_invoice" }, { status: 404 });
  }
  if (payment.status === "paid") {
    return NextResponse.json({ ok: true }); // already processed
  }

  await db.from("payments").update({ status: event.status }).eq("id", payment.id);
  if (event.status === "paid") {
    await db.from("events").update({ status: "active" }).eq("id", payment.event_id);
  }

  return NextResponse.json({ ok: true });
}
