import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider, WebhookEvent } from "./types";

/**
 * Kaspi Pay via a facilitator REST API (Kaspi has no public self-serve API;
 * merchants integrate through an aggregator). The exact endpoint shapes vary
 * by facilitator — this implements the common pattern:
 *
 *   POST {KASPI_API_URL}/invoices   { merchantId, amount, description,
 *                                     returnUrl }  → { invoiceId, paymentUrl }
 *   Webhook: JSON { invoiceId, status } signed with HMAC-SHA256 of the raw
 *   body in the `x-signature` header using KASPI_WEBHOOK_SECRET.
 *
 * Fill the four env vars and adjust field names to your facilitator's docs.
 */
export const kaspiProvider: PaymentProvider = {
  id: "kaspi",

  async createInvoice({ eventId, amount, description, returnUrl }) {
    const apiUrl = process.env.KASPI_API_URL;
    const apiToken = process.env.KASPI_API_TOKEN;
    const merchantId = process.env.KASPI_MERCHANT_ID;
    if (!apiUrl || !apiToken || !merchantId) {
      throw new Error(
        "Kaspi provider is not configured: set KASPI_API_URL, KASPI_API_TOKEN, KASPI_MERCHANT_ID (or use PAYMENTS_PROVIDER=mock)."
      );
    }

    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        merchantId,
        amount,
        currency: "KZT",
        description,
        orderId: eventId,
        returnUrl,
      }),
    });
    if (!res.ok) {
      throw new Error(`Kaspi createInvoice failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { invoiceId: string; paymentUrl: string };
    return { externalId: data.invoiceId, paymentUrl: data.paymentUrl };
  },

  async verifyWebhook(rawBody, headers): Promise<WebhookEvent | null> {
    const secret = process.env.KASPI_WEBHOOK_SECRET;
    const signature = headers.get("x-signature");
    if (!secret || !signature) return null;

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
      const body = JSON.parse(rawBody) as { invoiceId?: string; status?: string };
      if (!body.invoiceId) return null;
      const status =
        body.status === "Processed" || body.status === "paid" ? "paid" : "failed";
      return { externalId: body.invoiceId, status };
    } catch {
      return null;
    }
  },
};
