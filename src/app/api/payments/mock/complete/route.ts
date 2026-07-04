import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { signMockPayload } from "@/lib/payments/mock";

/**
 * Sandbox-only: plays the role of the payment facilitator's backend.
 * Signs the payload and delivers it to our own webhook over HTTP, so the
 * exact production path (signature check → status update → activation)
 * is exercised end to end.
 */
export async function POST(req: NextRequest) {
  if (config.paymentsProvider !== "mock") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let externalId: string, outcome: string;
  try {
    ({ externalId, outcome } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const status = outcome === "paid" ? "paid" : "failed";
  if (!externalId) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const res = await fetch(`${config.appUrl}/api/payments/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      externalId,
      status,
      signature: signMockPayload(externalId, status),
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "webhook_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, status });
}
