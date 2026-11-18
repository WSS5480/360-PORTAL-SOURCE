export type OrderBillingStatus = "NEEDS_INVOICE" | "INVOICED" | "PARTIALLY_PAID" | "PAID";

export type PrimaryInvoiceBillingInput = {
  status?: string | null;
  amount_paid?: number | string | null;
  total?: number | string | null;
  voided_at?: string | null;
};

function safeUpper(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Money-facing order status after fulfillment is settled.
 * Never returns COMPLETED — that label read as "paid" while meaning only "invoice exists".
 */
export function orderStatusFromPrimaryInvoice(
  invoice: PrimaryInvoiceBillingInput | null | undefined
): OrderBillingStatus {
  if (!invoice || invoice.voided_at) return "NEEDS_INVOICE";

  const st = safeUpper(invoice.status);
  if (!st || st === "DRAFT" || st === "VOID" || st === "VOIDED") return "NEEDS_INVOICE";

  const paid = safeNum(invoice.amount_paid);
  const total = safeNum(invoice.total);
  if (st === "PAID" || (total > 0 && paid + 0.02 >= total)) return "PAID";
  if (st === "PARTIALLY_PAID" || paid > 0.02) return "PARTIALLY_PAID";
  return "INVOICED";
}
