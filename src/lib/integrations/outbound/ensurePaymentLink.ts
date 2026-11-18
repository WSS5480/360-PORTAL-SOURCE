import { outstandingCents } from "@/lib/integrations/outbound/paymentPlan";
import { planInvoice } from "@/lib/integrations/outbound/invoiceReadiness";
import type { FulfillmentSnapshot } from "@/lib/integrations/outbound/types";
import { createInvoiceCheckoutSession } from "@/lib/stripe/createInvoiceCheckoutSession";
import { stripe } from "@/lib/stripe/server";

function checkoutMetadata(current: unknown, session: { url: string; sessionId: string; paymentIntentId: string | null; amountCents: number }) {
  const metadata = current && typeof current === "object" ? { ...(current as Record<string, unknown>) } : {};
  metadata.partner_checkout = {
    url: session.url,
    session_id: session.sessionId,
    payment_intent_id: session.paymentIntentId,
    amount_cents: session.amountCents,
    created_at: new Date().toISOString(),
  };
  return metadata;
}

/** Mint one Stripe Checkout link for the current outstanding balance and remember it on the invoice. */
export async function ensureInvoiceCheckoutLink(sb: any, snapshot: FulfillmentSnapshot): Promise<FulfillmentSnapshot> {
  const invoice = snapshot.primaryInvoice;
  if (!invoice || planInvoice(snapshot).action !== "send") return snapshot;
  const remaining = outstandingCents(invoice.total, snapshot.payments ?? []);
  if (remaining < 50) return snapshot;
  if (snapshot.paymentLink?.url.startsWith("https://") && snapshot.paymentLink.amountCents === remaining) return snapshot;

  const session = await createInvoiceCheckoutSession({
    invoiceId: invoice.id,
    orderId: snapshot.orderId,
    invoiceNumber: invoice.invoiceNumber,
    amountCents: remaining,
  });
  if (!session) return snapshot;

  const current = await sb.from("invoices").select("metadata").eq("id", invoice.id).maybeSingle();
  if (current?.error) return snapshot;
  const previous = (current?.data?.metadata as { partner_checkout?: { session_id?: string } } | null)?.partner_checkout?.session_id;
  if (previous && previous !== session.sessionId) {
    try {
      await stripe.checkout.sessions.expire(previous);
    } catch {
      // The replacement link is still saved. The expired call is what stops the old amount from being paid.
    }
  }
  const metadata = checkoutMetadata(current?.data?.metadata ?? invoice.metadata, session);
  const updated = await sb.from("invoices").update({ metadata }).eq("id", invoice.id);
  if (updated?.error) return snapshot;

  return {
    ...snapshot,
    primaryInvoice: { ...invoice, metadata },
    paymentLink: { url: session.url, amountCents: session.amountCents },
  };
}
