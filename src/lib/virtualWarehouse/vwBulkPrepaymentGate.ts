import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Bulk orders that allocate units to virtual warehouse must be paid (or in-flight ACH)
 * before the portal can confirm/submit the order to 360 Medical.
 */
export async function invoiceMeetsVirtualWarehouseBulkPrepayment(
  sb: SupabaseClient,
  invoiceId: string
): Promise<boolean> {
  const id = safeStr(invoiceId);
  if (!UUID_RE.test(id)) return false;

  const { data: inv, error } = await sb
    .from("invoices")
    .select("id, total, amount_paid, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !inv) return false;

  const total = Math.max(0, safeNum((inv as any).total));
  const paidField = Math.max(0, safeNum((inv as any).amount_paid));

  let paymentsTotal = 0;
  try {
    const { data: payRows } = await sb.from("invoice_payments").select("amount").eq("invoice_id", id);
    paymentsTotal = (payRows ?? []).reduce((sum: number, r: any) => sum + safeNum(r?.amount), 0);
  } catch {
    paymentsTotal = 0;
  }

  const amountPaid = Math.max(paidField, paymentsTotal);
  if (total > 0 && amountPaid + 0.01 >= total) return true;

  const st = safeStr((inv as any).status).toUpperCase();
  if (st === "PAID") return true;

  const { data: pendStripe } = await sb
    .from("invoice_payment_submissions")
    .select("id, reference, method, status")
    .eq("invoice_id", id)
    .eq("method", "STRIPE")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(5);

  for (const row of pendStripe ?? []) {
    const piId = safeStr((row as any).reference);
    if (!piId.startsWith("pi_")) continue;
    try {
      const intent = await stripe.paymentIntents.retrieve(piId);
      if (intent.status === "processing" || intent.status === "requires_action") {
        return true;
      }
      if (intent.status === "succeeded") {
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}
