import { planInvoice } from "@/lib/integrations/outbound/invoiceReadiness";
import { moneyCents } from "@/lib/integrations/outbound/payload";
import type { CallbackPayload, FulfillmentSnapshot, PlannedJob } from "@/lib/integrations/outbound/types";

const RECEIPT_METHODS = new Set(["credit_card", "ach", "wire"]);

export type AppliedPartnerPayment = {
  id: string;
  externalPaymentId: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  confirmationCode: string;
};

export function outstandingCents(total: number, payments: Array<{ amount: number }>): number {
  const paid = payments.reduce((sum, payment) => sum + moneyCents(payment.amount), 0);
  return Math.max(0, moneyCents(total) - paid);
}

function base(snapshot: FulfillmentSnapshot) {
  return {
    partnerId: snapshot.partnerId,
    orderId: snapshot.orderId,
    externalOrderNumber: snapshot.externalOrderNumber,
  };
}

/** Nimble staging records payment_date as a calendar date, not a timestamp. */
export function partnerPaymentDate(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] || value.trim();
}

function paymentLinkJob(snapshot: FulfillmentSnapshot, invoiceId: string, status: PlannedJob["status"], reason: string | null, payload: CallbackPayload): PlannedJob {
  return {
    ...base(snapshot),
    eventType: "payment-link",
    businessKey: `payment-link:${invoiceId}`,
    status,
    blockedReason: status === "blocked" ? reason : null,
    waitReason: status === "pending" ? reason : null,
    payload,
  };
}

export function planPaymentJobs(snapshot: FulfillmentSnapshot): PlannedJob[] {
  const jobs: PlannedJob[] = [];
  const invoice = snapshot.primaryInvoice;
  if (!invoice) return jobs;
  const payments = snapshot.payments ?? [];

  if (planInvoice(snapshot).action === "send") {
    const remaining = outstandingCents(invoice.total, payments);
    const url = snapshot.paymentLink?.url || "";
    if (remaining <= 0) {
      // The balance is paid. A replacement link would point at a zero-amount checkout.
    } else if (!url.startsWith("https://") || snapshot.paymentLink?.amountCents !== remaining) {
      jobs.push(paymentLinkJob(snapshot, invoice.id, "pending", "payment_link_not_ready", {}));
    } else {
      jobs.push(paymentLinkJob(snapshot, invoice.id, "pending", null, { payment_link_url: url }));
    }
  }

  for (const payment of payments) {
    if (!payment.externalPaymentId) continue;
    const ready =
      payment.amount > 0 &&
      RECEIPT_METHODS.has(payment.paymentMethod) &&
      Boolean(payment.confirmationCode) &&
      Boolean(payment.paidAt);
    jobs.push({
      ...base(snapshot),
      eventType: "payment",
      businessKey: `payment:${payment.externalPaymentId}`,
      status: "pending",
      blockedReason: null,
      waitReason: ready ? null : "payment_details_incomplete",
      payload: ready
        ? {
            amount: Math.round(payment.amount * 100) / 100,
            payment_date: partnerPaymentDate(payment.paidAt),
            payment_method: payment.paymentMethod,
            confirmation_code: payment.confirmationCode,
          }
        : {},
    });
  }

  return jobs;
}
