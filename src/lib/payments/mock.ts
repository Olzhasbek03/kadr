import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import type { PaymentProvider, WebhookEvent } from "./types";

export function signMockPayload(externalId: string, status: string): string {
  return createHmac("sha256", config.webhookSecret)
    .update(`${externalId}:${status}`)
    .digest("hex");
}

/**
 * Sandbox provider that simulates the full invoice → checkout → webhook →
 * activation cycle. The "checkout" is our own /pay/mock/[invoiceId] page,
 * which fires a signed webhook exactly like a real facilitator would.
 */
export const mockProvider: PaymentProvider = {
  id: "mock",

  async createInvoice({ returnUrl }) {
    const externalId = randomUUID();
    const url = new URL(`/pay/mock/${externalId}`, config.appUrl);
    url.searchParams.set("return", returnUrl);
    return { externalId, paymentUrl: url.toString() };
  },

  async verifyWebhook(rawBody): Promise<WebhookEvent | null> {
    let body: { externalId?: string; status?: string; signature?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const { externalId, status, signature } = body;
    if (!externalId || !signature || (status !== "paid" && status !== "failed")) {
      return null;
    }
    const expected = signMockPayload(externalId, status);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { externalId, status };
  },
};
