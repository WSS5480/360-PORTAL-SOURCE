import { stripe } from "@/lib/stripe/server";

function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  return configured.replace(/\/+$/, "") || "http://127.0.0.1:3010";
}

export type InvoiceCheckoutSession = {
  url: string;
  sessionId: string;
  paymentIntentId: string | null;
  amountCents: number;
};

/**
 * Stripe-hosted Checkout for the outstanding invoice balance.
 * Card data is collected by Stripe. This function never receives a card number.
 */
export async function createInvoiceCheckoutSession(input: {
  invoiceId: string;
  orderId: string;
  invoiceNumber: string;
  amountCents: number;
}): Promise<InvoiceCheckoutSession | null> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 50) return null;
  const base = appBaseUrl();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card", "us_bank_account"],
      client_reference_id: input.invoiceId,
      metadata: {
        invoice_id: input.invoiceId,
        order_id: input.orderId,
      },
      payment_intent_data: {
        metadata: {
          invoice_id: input.invoiceId,
          order_id: input.orderId,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: input.amountCents,
            product_data: {
              name: `Invoice ${input.invoiceNumber || input.invoiceId.slice(0, 8)}`,
            },
          },
        },
      ],
      success_url: `${base}/pay/complete?invoice=${encodeURIComponent(input.invoiceId)}`,
      cancel_url: `${base}/pay/complete?invoice=${encodeURIComponent(input.invoiceId)}&canceled=1`,
    },
    { idempotencyKey: `partner-checkout-${input.invoiceId}-${input.amountCents}` }
  );
  if (!session.url || !session.url.startsWith("https://")) return null;
  const paymentIntent = session.payment_intent;
  const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id || null;
  return {
    url: session.url,
    sessionId: session.id,
    paymentIntentId,
    amountCents: input.amountCents,
  };
}
