import "server-only";
import { config } from "@/lib/config";
import type { PaymentProvider } from "./types";
import { mockProvider } from "./mock";
import { kaspiProvider } from "./kaspi";

const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
  kaspi: kaspiProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const provider = providers[config.paymentsProvider];
  if (!provider) {
    throw new Error(
      `Unknown PAYMENTS_PROVIDER "${config.paymentsProvider}". Available: ${Object.keys(providers).join(", ")}`
    );
  }
  return provider;
}

export type { PaymentProvider, CreateInvoiceInput, WebhookEvent } from "./types";
