import {
  settleCapturedPayment,
  type CapturedPaymentInput,
  type PaymentLedger,
  type SettleResult,
} from "@/lib/stripe/settleCapturedPayment";

type Db = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: any; error: { message?: string } | null }>;
  from: (table: string) => any;
};

function mapRpc(data: any): SettleResult {
  const outcome = String(data?.outcome || "");
  if (outcome === "applied" || outcome === "already_applied") {
    return { ok: true, applied: true, reason: outcome === "already_applied" ? "duplicate" : undefined };
  }
  if (outcome === "flagged" || outcome === "already_flagged") {
    return {
      ok: true,
      applied: false,
      reconciliation: "open",
      reason: String(data?.reason || outcome),
    };
  }
  return { ok: false, applied: false, reason: `reconciliation_record_failed:${outcome || "empty"}` };
}

function fallbackLedger(sb: Db): PaymentLedger {
  return {
    withInvoiceLock: (_key, run) => run(),
    async findApplied(paymentIntentId) {
      const { data, error } = await sb
        .from("invoice_payments")
        .select("id")
        .eq("external_payment_id", paymentIntentId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return Boolean(data?.id);
    },
    async findFlagged(paymentIntentId) {
      const { data, error } = await sb
        .from("stripe_payment_reconciliation")
        .select("id")
        .eq("payment_intent_id", paymentIntentId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return Boolean(data?.id);
    },
    async getInvoice(invoiceId) {
      const { data, error } = await sb.from("invoices").select("id, total, order_id").eq("id", invoiceId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return { total: Number(data.total ?? 0), orderId: data.order_id ? String(data.order_id) : null };
    },
    async sumApplied(invoiceId) {
      const { data, error } = await sb.from("invoice_payments").select("amount").eq("invoice_id", invoiceId);
      if (error) throw new Error(error.message);
      return (data ?? []).reduce((sum: number, row: { amount?: number }) => sum + Number(row.amount ?? 0), 0);
    },
    async insertApplied(input) {
      const detailed = {
        invoice_id: input.invoiceId,
        amount: input.amount,
        note: `stripe:${input.paymentIntentId}`,
        created_by_user_id: null,
        payment_method: input.paymentMethod,
        confirmation_code: input.confirmationCode,
        external_payment_id: input.paymentIntentId,
        paid_at: new Date().toISOString(),
      };
      let { error } = await sb.from("invoice_payments").insert(detailed);
      if (error && /column|schema cache/i.test(error.message || "")) {
        ({ error } = await sb.from("invoice_payments").insert({
          invoice_id: input.invoiceId,
          amount: input.amount,
          note: `stripe:${input.paymentIntentId}`,
          created_by_user_id: null,
        }));
      }
      if (!error) return { ok: true as const };
      if (/duplicate|unique/i.test(error.message || "")) return { ok: false as const, duplicate: true, error: error.message };
      return { ok: false as const, error: error.message || "insert_failed" };
    },
    async insertFlagged(input) {
      const { error } = await sb.from("stripe_payment_reconciliation").insert({
        payment_intent_id: input.paymentIntentId,
        invoice_id: input.invoiceId,
        order_id: input.orderId,
        amount: input.amount,
        reason: input.reason,
        status: "open",
        payment_method: input.paymentMethod,
        confirmation_code: input.confirmationCode,
      });
      if (!error) return { ok: true as const };
      if (/duplicate|unique/i.test(error.message || "")) return { ok: false as const, duplicate: true, error: error.message };
      return { ok: false as const, error: error.message || "insert_failed" };
    },
  };
}

export async function recordCapturedStripePayment(sb: Db, input: CapturedPaymentInput): Promise<SettleResult> {
  const rpc = await sb.rpc("record_succeeded_stripe_payment", {
    p_invoice_id: input.invoiceId,
    p_payment_intent_id: input.paymentIntentId,
    p_amount: input.amount,
    p_payment_method: input.paymentMethod,
    p_confirmation_code: input.confirmationCode,
  });
  if (!rpc.error) return mapRpc(rpc.data);
  const message = rpc.error.message || "";
  if (/does not exist|schema cache|record_succeeded_stripe_payment/i.test(message)) {
    return settleCapturedPayment(input, fallbackLedger(sb));
  }
  return { ok: false, applied: false, reason: `reconciliation_record_failed:${message}` };
}
