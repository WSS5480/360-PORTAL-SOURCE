export const FULFILLMENT_CALLBACK_ADAPTER = "fulfillment-callbacks-v1" as const;

export type SyncEventType = "invoice" | "shipment" | "payment-link" | "payment";

export type JobStatus = "pending" | "processing" | "succeeded" | "failed" | "blocked";

export type CallbackPayload = Record<string, string | number>;

export type PlannedJob = {
  partnerId: string;
  orderId: string;
  externalOrderNumber: string;
  eventType: SyncEventType;
  businessKey: string;
  status: "pending" | "blocked";
  blockedReason: string | null;
  waitReason: string | null;
  payload: CallbackPayload;
};

export type OutboundJob = Omit<PlannedJob, "status"> & {
  id: string;
  payloadHash: string | null;
  status: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  lastHttpStatus: number | null;
  lastError: string | null;
  updatedAt: string;
};

export type AttemptRecord = {
  jobId: string;
  attemptedAt: string;
  httpStatus: number | null;
  responseExcerpt: string | null;
  error: string | null;
  durationMs: number | null;
};

export type ClosedFulfillment = {
  id: string;
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
};

export type FulfillmentSnapshot = {
  partnerId: string;
  partnerEnvironment: "sandbox" | "production";
  partnerStatus: string;
  adapterCode: string;
  callbackBaseUrl: string | null;
  outboundCredentialActive: boolean;
  orderId: string;
  externalOrderNumber: string;
  orderStatus: string;
  orderTotal: number;
  orderShippingTotal: number;
  bulkMode: boolean;
  openFulfillmentCount: number;
  primaryInvoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    issuedAt: string | null;
    voided: boolean;
    metadata?: Record<string, unknown> | null;
  } | null;
  shippingSupplementCount: number;
  fulfillments: ClosedFulfillment[];
  paymentLink?: { url: string; amountCents: number } | null;
  payments?: Array<{
    id: string;
    externalPaymentId: string;
    amount: number;
    paidAt: string;
    paymentMethod: string;
    confirmationCode: string;
  }>;
};

export type DeliveryResult = {
  httpStatus: number | null;
  retryable: boolean;
  terminal: boolean;
  excerpt: string | null;
  error: string | null;
};
