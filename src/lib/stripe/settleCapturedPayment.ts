export const BALANCE_TOLERANCE = 0.02;

export type ReconciliationReason = "exceeds_balance" | "invoice_not_found" | "missing_invoice";

export type SettleResult = {
  ok: boolean;
  applied: boolean;
  reconciliation?: "open";
  reason?: string;
};

export type CapturedPaymentInput = {
  invoiceId: string | null;
  paymentIntentId: string;
  amount: number;
  paymentMethod: string | null;
  confirmationCode: string | null;
};

type InvoiceRow = { total: number; orderId: string | null };

export type PaymentLedger = {
  withInvoiceLock<T>(invoiceKey: string, run: () => Promise<T>): Promise<T>;
  findApplied(paymentIntentId: string): Promise<boolean>;
  findFlagged(paymentIntentId: string): Promise<boolean>;
  getInvoice(invoiceId: string): Promise<InvoiceRow | null>;
  sumApplied(invoiceId: string): Promise<number>;
  insertApplied(input: CapturedPaymentInput): Promise<{ ok: true } | { ok: false; duplicate?: boolean; error: string }>;
  insertFlagged(
    input: CapturedPaymentInput & { reason: ReconciliationReason; orderId: string | null }
  ): Promise<{ ok: true } | { ok: false; duplicate?: boolean; error: string }>;
};

function failed(error: string): SettleResult {
  return { ok: false, applied: false, reason: `reconciliation_record_failed:${error}` };
}

/**
 * Records a captured Stripe payment once.
 * An amount that fits the remaining balance becomes one invoice payment.
 * Any other captured payment is stored for reconciliation and is not applied.
 * This function does not refund.
 */
export async function settleCapturedPayment(input: CapturedPaymentInput, ledger: PaymentLedger): Promise<SettleResult> {
  const lockKey = input.invoiceId || input.paymentIntentId;
  try {
    return await ledger.withInvoiceLock(lockKey, () => settleLocked(input, ledger));
  } catch (err) {
    return failed(err instanceof Error ? err.message : "ledger_failed");
  }
}

async function settleLocked(input: CapturedPaymentInput, ledger: PaymentLedger): Promise<SettleResult> {
  if (await ledger.findApplied(input.paymentIntentId)) {
    return { ok: true, applied: true, reason: "duplicate" };
  }
  if (await ledger.findFlagged(input.paymentIntentId)) {
    return { ok: true, applied: false, reconciliation: "open", reason: "duplicate" };
  }
  if (!input.invoiceId) {
    return flag(input, ledger, "missing_invoice", null);
  }
  const invoice = await ledger.getInvoice(input.invoiceId);
  if (!invoice) {
    return flag(input, ledger, "invoice_not_found", null);
  }
  const paid = await ledger.sumApplied(input.invoiceId);
  if (input.amount > invoice.total - paid + BALANCE_TOLERANCE) {
    return flag(input, ledger, "exceeds_balance", invoice.orderId);
  }
  const inserted = await ledger.insertApplied(input);
  if (!inserted.ok && inserted.duplicate) return { ok: true, applied: true, reason: "duplicate" };
  if (!inserted.ok) return { ok: false, applied: false, reason: `insert_payment_failed:${inserted.error}` };
  return { ok: true, applied: true };
}

async function flag(
  input: CapturedPaymentInput,
  ledger: PaymentLedger,
  reason: ReconciliationReason,
  orderId: string | null
): Promise<SettleResult> {
  const inserted = await ledger.insertFlagged({ ...input, reason, orderId });
  if (!inserted.ok && inserted.duplicate) {
    return { ok: true, applied: false, reconciliation: "open", reason: "duplicate" };
  }
  if (!inserted.ok) return failed(inserted.error);
  return { ok: true, applied: false, reconciliation: "open", reason };
}

export function stripeCaptureWebhookStatus(result: { ok: boolean; reason?: string } | null | undefined): 200 | 500 {
  if (!result) return 500;
  if (result.ok) return 200;
  const reason = result.reason || "";
  if (
    reason === "exceeds_balance" ||
    reason.startsWith("reconciliation_record_failed") ||
    reason.startsWith("insert_payment_failed") ||
    reason.startsWith("update_invoice_failed") ||
    reason === "ledger_failed"
  ) {
    return 500;
  }
  return 200;
}
