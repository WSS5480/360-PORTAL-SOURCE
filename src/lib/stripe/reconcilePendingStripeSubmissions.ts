import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { applySucceededPaymentIntentToInvoice } from "@/lib/stripe/applySucceededPaymentIntentToInvoice";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * Pulls Stripe for any PENDING STRIPE submissions on this invoice; if the PaymentIntent
 * succeeded, applies it to the DB (same as webhook). Use when webhooks are misconfigured
 * or delayed (common with ACH + local dev).
 */
export async function reconcilePendingStripeSubmissionsForInvoice(invoiceId: string): Promise<void> {
  if (!UUID_RE.test(invoiceId)) return;
  if (!process.env.STRIPE_SECRET_KEY) return;

  const { data: subs } = await supabaseAdmin
    .from("invoice_payment_submissions")
    .select("reference")
    .eq("invoice_id", invoiceId)
    .eq("method", "STRIPE")
    .in("status", ["PENDING", "PENDING_BANK"]);

  const refs = [
    ...new Set(
      (subs ?? [])
        .map((s: { reference?: string | null }) => safeStr(s?.reference))
        .filter((r) => r.startsWith("pi_"))
    ),
  ];

  for (const ref of refs) {
    try {
      const intent = await stripe.paymentIntents.retrieve(ref);
      if (intent.status !== "succeeded") continue;

      const metaInv = safeStr(intent.metadata?.invoice_id);
      if (metaInv && metaInv !== invoiceId) continue;

      await applySucceededPaymentIntentToInvoice(intent, {
        expectedInvoiceId: invoiceId,
        ...(metaInv ? {} : { forcedInvoiceId: invoiceId }),
      });
    } catch {
      // ignore per intent
    }
  }
}
