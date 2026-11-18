/**
 * Payment-link and receipt jobs use the same outbox as invoice and shipment callbacks.
 * A link is a Stripe Checkout URL. A receipt is sent only after the existing
 * PaymentIntent apply path has recorded that payment once.
 */
export const PAYMENT_LINK_SYNC_ENABLED = true;
export const PAYMENT_RECEIPT_SYNC_ENABLED = true;

export const PAYMENT_INTEGRATION_RECOMMENDATION = {
  approach: "stripe-hosted-checkout",
  reason:
    "The current invoice payment page requires a 360 portal session. A Nimble clinic user has no portal account. Stripe Checkout can collect card or ACH on a hosted HTTPS page and return a PaymentIntent id. A public 360 page would have to duplicate that session-free flow and would hold more card-handling surface in this application.",
  authoritativeApply: "applySucceededPaymentIntentToInvoice",
  idempotencyKey: "PaymentIntent id, stored on invoice_payment_submissions.reference",
  methodMap: {
    card: "credit_card",
    us_bank_account: "ach",
    wire_submission: "wire",
  },
  externalPaymentId: "PaymentIntent id, wire submission id, or invoice_payments.id",
  constraints: [
    "Do not create a second payment record when the PaymentIntent id was already applied.",
    "Do not enqueue a payment link until the invoice total is final, including freight.",
    "Do not enqueue a receipt until that same payment has been applied by the existing webhook or confirm path.",
    "Manual invoice_payments still have no payment method or confirmation code, so they cannot satisfy the receipt callback until those fields exist.",
    "Never copy the full payment URL into outbound attempt logs.",
  ],
} as const;
