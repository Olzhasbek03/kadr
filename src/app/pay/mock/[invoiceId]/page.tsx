import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { config } from "@/lib/config";
import type { EventRow, PaymentRow } from "@/lib/types";
import MockCheckout from "@/components/pay/MockCheckout";

export const dynamic = "force-dynamic";

/** Sandbox checkout page — stands in for the Kaspi payment screen. */
export default async function MockPayPage(ctx: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  if (config.paymentsProvider !== "mock") notFound();

  const { invoiceId } = await ctx.params;
  const { return: returnUrl } = await ctx.searchParams;

  const db = supabaseAdmin();
  const { data: payment } = await db
    .from("payments")
    .select("*")
    .eq("provider", "mock")
    .eq("external_id", invoiceId)
    .maybeSingle<PaymentRow>();
  if (!payment) notFound();

  const { data: event } = await db
    .from("events")
    .select("*")
    .eq("id", payment.event_id)
    .maybeSingle<EventRow>();

  return (
    <MockCheckout
      externalId={payment.external_id}
      amount={payment.amount}
      alreadyPaid={payment.status === "paid"}
      eventName={event?.name ?? "Kadr"}
      returnUrl={
        returnUrl && returnUrl.startsWith(config.appUrl)
          ? returnUrl
          : `${config.appUrl}/dashboard/${payment.event_id}`
      }
    />
  );
}
