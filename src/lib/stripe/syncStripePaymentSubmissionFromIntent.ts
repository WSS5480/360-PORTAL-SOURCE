import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export function isUsBankPaymentIntent(intent: Stripe.PaymentIntent): boolean {
  const types = intent.payment_method_types ?? [];
  if (types.includes("us_bank_account")) return true;
  const pm = intent.payment_method;
  if (pm && typeof pm === "object" && "type" in pm && (pm as Stripe.PaymentMethod).type === "us_bank_account") {
    return true;
  }
  return false;
}

/**
 * Updates invoice_payment_submissions for this PaymentIntent (reference = intent.id, method STRIPE).
 * Does nothing when intent.status === "succeeded" — use applySucceededPaymentIntentToInvoice for that.
 */
export async function syncStripePaymentSubmissionFromIntent(intent: Stripe.PaymentIntent): Promise<void> {
  if (!intent.id?.startsWith("pi_")) return;

  const stripeStatus = intent.status;
  if (stripeStatus === "succeeded") return;

  const bank = isUsBankPaymentIntent(intent);
  let submissionStatus: "PENDING" | "PENDING_BANK" | "REJECTED" = "PENDING";

  if (
    stripeStatus === "processing" ||
    stripeStatus === "requires_action" ||
    stripeStatus === "requires_confirmation"
  ) {
    submissionStatus = bank ? "PENDING_BANK" : "PENDING";
  } else if (stripeStatus === "canceled") {
    submissionStatus = "REJECTED";
  } else if (stripeStatus === "requires_payment_method") {
    submissionStatus = intent.last_payment_error ? "REJECTED" : "PENDING";
  } else {
    submissionStatus = "PENDING";
  }

  const row: Record<string, unknown> = {
    stripe_payment_intent_status: stripeStatus,
    status: submissionStatus,
  };
  if (submissionStatus === "REJECTED") {
    row.verified_at = new Date().toISOString();
    row.verified_by_user_id = null;
  }

  await supabaseAdmin.from("invoice_payment_submissions").update(row).eq("reference", intent.id).eq("method", "STRIPE");
}
