import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  settleCapturedPayment,
  stripeCaptureWebhookStatus,
  type CapturedPaymentInput,
  type PaymentLedger,
  type ReconciliationReason,
} from "@/lib/stripe/settleCapturedPayment";

type Invoice = { total: number; orderId: string | null };
type Payment = { invoiceId: string; paymentIntentId: string; amount: number };
type Flag = { paymentIntentId: string; invoiceId: string | null; amount: number; reason: ReconciliationReason };

function memoryLedger(options?: { failFlag?: boolean }) {
  const invoices = new Map<string, Invoice>();
  const payments: Payment[] = [];
  const flags: Flag[] = [];
  const tails = new Map<string, Promise<unknown>>();

  const ledger: PaymentLedger = {
    async withInvoiceLock(key, run) {
      const previous = tails.get(key) ?? Promise.resolve();
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolveGate) => {
        release = resolveGate;
      });
      const tail = previous.then(() => gate);
      tails.set(key, tail);
      await previous;
      try {
        return await run();
      } finally {
        release();
      }
    },
    async findApplied(paymentIntentId) {
      return payments.some((row) => row.paymentIntentId === paymentIntentId);
    },
    async findFlagged(paymentIntentId) {
      return flags.some((row) => row.paymentIntentId === paymentIntentId);
    },
    async getInvoice(invoiceId) {
      return invoices.get(invoiceId) ?? null;
    },
    async sumApplied(invoiceId) {
      return payments.filter((row) => row.invoiceId === invoiceId).reduce((sum, row) => sum + row.amount, 0);
    },
    async insertApplied(input) {
      if (payments.some((row) => row.paymentIntentId === input.paymentIntentId)) {
        return { ok: false, duplicate: true, error: "duplicate" };
      }
      payments.push({ invoiceId: input.invoiceId || "", paymentIntentId: input.paymentIntentId, amount: input.amount });
      return { ok: true };
    },
    async insertFlagged(input) {
      if (options?.failFlag) return { ok: false, error: "reconciliation table unavailable" };
      if (flags.some((row) => row.paymentIntentId === input.paymentIntentId)) {
        return { ok: false, duplicate: true, error: "duplicate" };
      }
      flags.push({
        paymentIntentId: input.paymentIntentId,
        invoiceId: input.invoiceId,
        amount: input.amount,
        reason: input.reason,
      });
      return { ok: true };
    },
  };

  return { invoices, payments, flags, ledger };
}

function payment(partial: Partial<CapturedPaymentInput> = {}): CapturedPaymentInput {
  return {
    invoiceId: "invoice-1",
    paymentIntentId: "pi_test_partial",
    amount: 40,
    paymentMethod: "credit_card",
    confirmationCode: "ch_test_partial",
    ...partial,
  };
}

describe("captured Stripe payments", () => {
  it("applies a partial payment once and does not open a reconciliation case", async () => {
    const store = memoryLedger();
    store.invoices.set("invoice-1", { total: 90, orderId: "order-1" });
    const first = await settleCapturedPayment(payment(), store.ledger);
    const duplicate = await settleCapturedPayment(payment(), store.ledger);
    expect(first).toMatchObject({ ok: true, applied: true });
    expect(duplicate).toMatchObject({ ok: true, applied: true, reason: "duplicate" });
    expect(store.payments).toHaveLength(1);
    expect(store.flags).toHaveLength(0);
    expect(stripeCaptureWebhookStatus(first)).toBe(200);
    expect(stripeCaptureWebhookStatus(duplicate)).toBe(200);
  });

  it("records an overpayment for reconciliation without applying it or refunding it", async () => {
    const store = memoryLedger();
    store.invoices.set("invoice-1", { total: 90, orderId: "order-1" });
    const result = await settleCapturedPayment(payment({ paymentIntentId: "pi_test_over", amount: 100 }), store.ledger);
    expect(result).toMatchObject({ ok: true, applied: false, reconciliation: "open", reason: "exceeds_balance" });
    expect(store.payments).toHaveLength(0);
    expect(store.flags).toEqual([
      expect.objectContaining({ paymentIntentId: "pi_test_over", amount: 100, reason: "exceeds_balance" }),
    ]);
    expect(stripeCaptureWebhookStatus(result)).toBe(200);
    const replay = await settleCapturedPayment(payment({ paymentIntentId: "pi_test_over", amount: 100 }), store.ledger);
    expect(replay).toMatchObject({ ok: true, applied: false, reconciliation: "open", reason: "duplicate" });
    expect(store.flags).toHaveLength(1);
  });

  it("keeps one of two concurrent payments and flags the one that no longer fits", async () => {
    const store = memoryLedger();
    store.invoices.set("invoice-1", { total: 90, orderId: "order-1" });
    const results = await Promise.all([
      settleCapturedPayment(payment({ paymentIntentId: "pi_test_a", amount: 60 }), store.ledger),
      settleCapturedPayment(payment({ paymentIntentId: "pi_test_b", amount: 60 }), store.ledger),
    ]);
    expect(results.filter((result) => result.applied)).toHaveLength(1);
    expect(results.filter((result) => result.reconciliation === "open")).toHaveLength(1);
    expect(store.payments).toHaveLength(1);
    expect(store.flags).toHaveLength(1);
    expect(store.flags[0]?.reason).toBe("exceeds_balance");
  });

  it("asks Stripe to retry when the reconciliation record cannot be written", async () => {
    const store = memoryLedger({ failFlag: true });
    store.invoices.set("invoice-1", { total: 90, orderId: "order-1" });
    const result = await settleCapturedPayment(payment({ paymentIntentId: "pi_test_fail", amount: 100 }), store.ledger);
    expect(result.ok).toBe(false);
    expect(result.applied).toBe(false);
    expect(result.reason).toContain("reconciliation_record_failed");
    expect(store.payments).toHaveLength(0);
    expect(store.flags).toHaveLength(0);
    expect(stripeCaptureWebhookStatus(result)).toBe(500);
    expect(stripeCaptureWebhookStatus({ ok: false, reason: "exceeds_balance" })).toBe(500);
    expect(stripeCaptureWebhookStatus({ ok: false, reason: "not_succeeded" })).toBe(200);
  });

  it("stores the reconciliation rule in SQL without refunds or payment deletes", () => {
    const sql = readFileSync(resolve("db/migrations/20261021_stripe_payment_reconciliation.sql"), "utf8");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("UNIQUE (payment_intent_id)");
    expect(sql).toContain("exceeds_balance");
    expect(sql).toContain("0.02");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).not.toContain("DROP TABLE");
    expect(sql).not.toMatch(/stripe\.refunds|refunds\.create/i);
    expect(sql).not.toContain("DELETE FROM public.invoice_payments");
  });
});
