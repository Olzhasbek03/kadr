export interface CreateInvoiceInput {
  eventId: string;
  /** Amount in KZT. */
  amount: number;
  description: string;
  /** Where the payer lands after checkout. */
  returnUrl: string;
}

export interface CreateInvoiceResult {
  /** Provider-side invoice id, stored as payments.external_id. */
  externalId: string;
  /** Checkout URL to redirect the host to. */
  paymentUrl: string;
}

export interface WebhookEvent {
  externalId: string;
  status: "paid" | "failed";
}

/**
 * Swappable payment gateway. Kaspi Pay ships as a facilitator-API stub;
 * Freedom Pay / Halyk ePay can be added by implementing this interface
 * and registering the provider in `lib/payments/index.ts`.
 */
export interface PaymentProvider {
  readonly id: string;
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  /**
   * Verify an incoming callback. Returns the parsed event when the
   * signature is valid, or null to reject with 401.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
}
