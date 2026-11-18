import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deliverFulfillmentCallback } from "@/lib/integrations/outbound/callbackAdapter";
import { decryptOutboundSecret, encryptOutboundSecret } from "@/lib/integrations/outbound/credentialCipher";
import { OutboundJobQueue, applyManualRetry } from "@/lib/integrations/outbound/jobQueue";
import { PAYMENT_LINK_SYNC_ENABLED, PAYMENT_RECEIPT_SYNC_ENABLED } from "@/lib/integrations/outbound/paymentSyncDesign";
import { planPartnerJobs } from "@/lib/integrations/outbound/planPartnerJobs";
import { advanceOutboundJob } from "@/lib/integrations/outbound/processOutboundJob";
import { redactSyncText } from "@/lib/integrations/outbound/redact";
import { schedulePartnerFulfillmentSync } from "@/lib/integrations/outbound/schedulePartnerFulfillmentSync";
import type { DeliveryResult, FulfillmentSnapshot, OutboundJob, PlannedJob } from "@/lib/integrations/outbound/types";
import { reconcileOutboundOrders } from "@/lib/integrations/outbound/runOutboundWorker";
import { orderNeedsFulfillmentSync } from "@/lib/integrations/outbound/syncGaps";
import { authorizeOutboundWorker, outboundDeliveryEnabled } from "@/lib/integrations/outbound/workerAuth";

const NOW = new Date("2026-10-20T15:00:00.000Z");
const PARTNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const INVOICE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function snapshot(overrides: Partial<FulfillmentSnapshot> = {}): FulfillmentSnapshot {
  return {
    partnerId: PARTNER,
    partnerEnvironment: "sandbox",
    partnerStatus: "active",
    adapterCode: "fulfillment-callbacks-v1",
    callbackBaseUrl: "https://sandbox.example.test",
    outboundCredentialActive: true,
    orderId: ORDER,
    externalOrderNumber: "ORD-PARTNER-100",
    orderStatus: "INVOICED",
    orderTotal: 125,
    orderShippingTotal: 25,
    bulkMode: false,
    openFulfillmentCount: 0,
    primaryInvoice: {
      id: INVOICE,
      invoiceNumber: "INV-100",
      status: "ISSUED",
      total: 125,
      issuedAt: "2026-10-20T14:00:00.000Z",
      voided: false,
    },
    shippingSupplementCount: 0,
    fulfillments: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        status: "CLOSED",
        trackingNumber: "1Z111",
        carrier: "FedEx",
        shippedAt: "2026-10-20T13:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function ok(status: number, excerpt: string | null = null): DeliveryResult {
  const terminal = status === 409 || status === 422;
  const retryable = status === 401 || status === 408 || status === 429 || status >= 500 || status === 0;
  return {
    httpStatus: status === 0 ? null : status,
    retryable: status === 0 ? true : retryable,
    terminal,
    excerpt,
    error: status === 200 ? null : status === 0 ? "network_error" : `http_${status}`,
  };
}

async function enqueueAndClaim(state: FulfillmentSnapshot, now = NOW) {
  const queue = new OutboundJobQueue();
  await queue.upsert(planPartnerJobs(state), now);
  const claimed = await queue.claim("worker-a", 10, now);
  return { queue, claimed };
}

describe("integration migrations", () => {
  const foundation = readFileSync(resolve("db/migrations/20261020_integration_partner_foundation.sql"), "utf8");
  const outbound = readFileSync(resolve("db/migrations/20261020_integration_outbound_outbox.sql"), "utf8");

  it("keeps partner isolation, production locks, and a transactional claim", () => {
    expect(foundation).toContain("UNIQUE (partner_id, external_order_number)");
    expect(foundation).toContain("UNIQUE (partner_id, idempotency_key)");
    expect(foundation).toContain("FOR UPDATE");
    expect(foundation).toContain("integration_credentials_reject_production_activation");
    expect(foundation).toContain("ENABLE ROW LEVEL SECURITY");
    expect(foundation).toContain("GRANT EXECUTE ON FUNCTION public.integration_submit_priced_order");
    expect(foundation).not.toContain("DROP TABLE");
    expect(foundation).not.toContain("product_variants_active_sku_idx");
  });

  it("creates a durable outbox that can be claimed concurrently and does not include payment events", () => {
    expect(outbound).toContain("FOR UPDATE SKIP LOCKED");
    expect(outbound).toContain("integration_list_orders_needing_sync");
    expect(outbound).toContain("shipment:' || fulfillment.id");
    expect(outbound).not.toContain("LIMIT 50");
    expect(outbound).toContain("interval '10 minutes'");
    expect(outbound).toContain("UNIQUE (partner_id, event_type, business_key)");
    expect(outbound).toContain("event_type IN ('invoice', 'shipment')");
    expect(outbound).toContain("ENABLE ROW LEVEL SECURITY");
    expect(outbound).toContain("GRANT EXECUTE ON FUNCTION public.integration_claim_outbound_jobs");
    expect(outbound).not.toContain("payment-link");
    expect(outbound).not.toContain("DROP TABLE");
    const payments = readFileSync(resolve("db/migrations/20261020_integration_payment_sync.sql"), "utf8");
    expect(payments).toContain("event_type IN ('invoice', 'shipment', 'payment-link', 'payment')");
    expect(payments).toContain("invoice_payments_external_payment_id_uidx");
    expect(payments).toContain("'payment:' || payment.external_payment_id");
    expect(payments).not.toContain("DROP TABLE");
    const columns = readFileSync(resolve("db/migrations/20261021_inventory_lot_and_trace_columns.sql"), "utf8");
    expect(columns).toContain("product_variant_lots");
    expect(columns).toContain("ADD COLUMN IF NOT EXISTS raw_scan text");
    expect(columns).toContain("ADD COLUMN IF NOT EXISTS location text");
    expect(columns).toContain("fulfillment_item_trace");
    expect(columns).toContain("ADD COLUMN IF NOT EXISTS source text");
    expect(columns).not.toContain("DROP TABLE");
  });
});

describe("fulfillment callback generation", () => {
  it("patches the partner order number for an invoice and a shipment", async () => {
    const calls: Array<{ url: string; method: string; authorization: string; body: string }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: String(init?.method),
        authorization: String(new Headers(init?.headers).get("authorization")),
        body: String(init?.body),
      });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    await deliverFulfillmentCallback(
      {
        baseUrl: "https://sandbox.example.test",
        token: "sandbox-bearer-token-value",
        externalOrderNumber: "ORD-PARTNER-100",
        eventType: "invoice",
        payload: { invoice_number: "INV-100", final_total: 125 },
      },
      fetchImpl
    );
    await deliverFulfillmentCallback(
      {
        baseUrl: "https://sandbox.example.test/",
        token: "sandbox-bearer-token-value",
        externalOrderNumber: "ORD/PARTNER 100",
        eventType: "shipment",
        payload: { tracking_number: "1Z111", ship_via: "FedEx" },
      },
      fetchImpl
    );

    expect(calls[0]?.url).toBe("https://sandbox.example.test/api/integrations/v1/orders/ORD-PARTNER-100/invoice");
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[1]?.url).toBe(
      "https://sandbox.example.test/api/integrations/v1/orders/ORD%2FPARTNER%20100/shipment"
    );
    expect(calls[0]?.body).toContain("INV-100");
    expect(calls[0]?.body).not.toContain(ORDER);
  });

  it("does not call a non-https callback", async () => {
    let called = false;
    const result = await deliverFulfillmentCallback(
      {
        baseUrl: "http://sandbox.example.test",
        token: "sandbox-bearer-token-value",
        externalOrderNumber: "ORD-PARTNER-100",
        eventType: "invoice",
        payload: { invoice_number: "INV-100", final_total: 125 },
      },
      (async () => {
        called = true;
        return new Response("no", { status: 200 });
      }) as typeof fetch
    );
    expect(called).toBe(false);
    expect(result.error).toBe("callback_url_not_https");
    const local = await deliverFulfillmentCallback(
      {
        baseUrl: "http://127.0.0.1:9099",
        token: "sandbox-bearer-token-value",
        externalOrderNumber: "ORD-PARTNER-100",
        eventType: "shipment",
        payload: { tracking_number: "1Z111" },
      },
      (async () => new Response("{}", { status: 200 })) as typeof fetch
    );
    expect(local.httpStatus).toBe(200);
  });
});

describe("outbound synchronization", () => {
  it("sends an invoice only after freight is final and the totals match", async () => {
    const waiting = snapshot({ openFulfillmentCount: 1, orderShippingTotal: 0, orderTotal: 100, primaryInvoice: { ...snapshot().primaryInvoice!, total: 100 } });
    const waitingPlan = planPartnerJobs(waiting).find((job) => job.eventType === "invoice");
    expect(waitingPlan?.waitReason).toBe("freight_not_final");

    const diverged = snapshot({
      orderTotal: 125,
      orderShippingTotal: 25,
      primaryInvoice: { ...snapshot().primaryInvoice!, total: 100 },
    });
    expect(planPartnerJobs(diverged).find((job) => job.eventType === "invoice")?.blockedReason).toBe(
      "invoice_total_excludes_final_freight"
    );

    const supplement = snapshot({ shippingSupplementCount: 1 });
    expect(planPartnerJobs(supplement).find((job) => job.eventType === "invoice")?.blockedReason).toBe(
      "shipping_supplement_not_supported"
    );

    const bulk = snapshot({
      bulkMode: true,
      orderTotal: 125,
      orderShippingTotal: 25,
      primaryInvoice: { ...snapshot().primaryInvoice!, total: 100 },
    });
    expect(planPartnerJobs(bulk).find((job) => job.eventType === "invoice")?.blockedReason).toBe(
      "shipping_supplement_would_change_final_total"
    );

    const ready = snapshot();
    const { claimed } = await enqueueAndClaim(ready);
    const invoice = claimed.find((job) => job.eventType === "invoice");
    expect(invoice).toBeTruthy();
    let sentPayload: unknown = null;
    const result = await advanceOutboundJob({
      job: invoice as OutboundJob,
      snapshot: ready,
      token: "sandbox-token",
      now: NOW,
      deliver: async (request) => {
        sentPayload = request.payload;
        expect(request.externalOrderNumber).toBe("ORD-PARTNER-100");
        return ok(200);
      },
    });
    expect(result.job.status).toBe("succeeded");
    expect(sentPayload).toMatchObject({ invoice_number: "INV-100", final_total: 125 });
  });

  it("keeps a later shipment blocked instead of replacing the first tracking number", async () => {
    const state = snapshot({
      fulfillments: [
        {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          status: "CLOSED",
          trackingNumber: "1Z111",
          carrier: "FedEx",
          shippedAt: "2026-10-20T13:00:00.000Z",
        },
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          status: "CLOSED",
          trackingNumber: "1Z222",
          carrier: "FedEx",
          shippedAt: "2026-10-20T16:00:00.000Z",
        },
      ],
    });
    const queue = new OutboundJobQueue();
    await queue.upsert(planPartnerJobs(state), NOW);
    const extra = queue.jobs.find((job) => job.businessKey.endsWith("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"));
    expect(extra?.status).toBe("blocked");
    expect(extra?.blockedReason).toBe("partner_single_shipment_limit");
    expect(extra?.payload.tracking_number).toBe("1Z222");

    const calls: string[] = [];
    const advanced = await advanceOutboundJob({
      job: extra as OutboundJob,
      snapshot: state,
      token: "sandbox-token",
      now: NOW,
      deliver: async () => {
        calls.push("sent");
        return ok(200);
      },
    });
    expect(calls).toEqual([]);
    expect(advanced.job.status).toBe("blocked");
    expect(advanced.job.payload.tracking_number).toBe("1Z222");
  });

  it("retries a network or server failure and does not repeat a succeeded callback", async () => {
    const state = snapshot();
    const { queue, claimed } = await enqueueAndClaim(state);
    const shipment = claimed.find((job) => job.eventType === "shipment") as OutboundJob;
    let calls = 0;
    const failed = await advanceOutboundJob({
      job: shipment,
      snapshot: state,
      token: "sandbox-token",
      now: NOW,
      deliver: async () => {
        calls += 1;
        return ok(0);
      },
    });
    expect(failed.job.status).toBe("pending");
    expect(failed.job.attemptCount).toBe(1);
    expect(failed.attempt?.error).toBe("network_error");
    await queue.save(failed.job, failed.attempt);
    await queue.upsert(planPartnerJobs(state), NOW);
    expect(queue.jobs.find((job) => job.id === failed.job.id)?.nextAttemptAt).toBe(failed.job.nextAttemptAt);
    expect(await queue.claim("worker-b", 10, NOW)).toEqual([]);

    const later = new Date(NOW.getTime() + 31_000);
    const [retried] = await queue.claim("worker-b", 10, later);
    const serverFailure = await advanceOutboundJob({
      job: retried,
      snapshot: state,
      token: "sandbox-token",
      now: later,
      deliver: async () => {
        calls += 1;
        return ok(500, "temporary");
      },
    });
    expect(serverFailure.job.status).toBe("pending");
    expect(serverFailure.job.lastHttpStatus).toBe(500);

    const recovered = await advanceOutboundJob({
      job: { ...serverFailure.job, status: "processing" },
      snapshot: state,
      token: "sandbox-token",
      now: new Date(later.getTime() + 120_000),
      deliver: async () => {
        calls += 1;
        return ok(200, "accepted");
      },
    });
    const replay = await advanceOutboundJob({
      job: recovered.job,
      snapshot: state,
      token: "sandbox-token",
      now: new Date(later.getTime() + 130_000),
      deliver: async () => {
        calls += 1;
        return ok(200);
      },
    });
    expect(recovered.job.status).toBe("succeeded");
    expect(replay.delivered).toBe(false);
    expect(calls).toBe(3);
  });

  it("blocks Nimble 409 and 422 responses without scheduling another attempt", async () => {
    for (const status of [409, 422] as const) {
      const state = snapshot();
      const { queue, claimed } = await enqueueAndClaim(state);
      const invoice = claimed.find((job) => job.eventType === "invoice") as OutboundJob;
      let calls = 0;
      const result = await advanceOutboundJob({
        job: invoice,
        snapshot: state,
        token: "sandbox-token",
        now: NOW,
        deliver: async () => {
          calls += 1;
          return ok(status, status === 409 ? "finalized" : "invalid");
        },
      });
      await queue.save(result.job, result.attempt);
      expect(result.job.status).toBe("blocked");
      expect(result.job.blockedReason).toBe(status === 409 ? "partner_conflict" : "partner_rejected");
      expect(await queue.claim("worker-b", 10, new Date(NOW.getTime() + 86_400_000))).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: invoice.id, eventType: "invoice" })])
      );
      expect(calls).toBe(1);
    }
  });

  it("records a blocked revision when an invoice total changes after a successful sync", async () => {
    const state = snapshot();
    const queue = new OutboundJobQueue();
    await queue.upsert(planPartnerJobs(state), NOW);
    const invoice = queue.jobs.find((job) => job.eventType === "invoice") as OutboundJob;
    invoice.status = "succeeded";
    invoice.lastHttpStatus = 200;
    const changed = snapshot({
      orderTotal: 140,
      orderShippingTotal: 40,
      primaryInvoice: { ...snapshot().primaryInvoice!, total: 140 },
    });
    await queue.upsert(planPartnerJobs(changed), NOW);
    const revision = queue.jobs.find((job) => job.businessKey.endsWith(":revision"));
    expect(revision?.status).toBe("blocked");
    expect(revision?.blockedReason).toBe("invoice_total_changed_after_sync");
    expect(queue.jobs.find((job) => job.id === invoice.id)?.status).toBe("succeeded");
    let calls = 0;
    const advanced = await advanceOutboundJob({
      job: revision as OutboundJob,
      snapshot: changed,
      token: "sandbox-token",
      now: NOW,
      deliver: async () => {
        calls += 1;
        return ok(200);
      },
    });
    expect(calls).toBe(0);
    expect(advanced.job.status).toBe("blocked");
  });

  it("releases a stale worker lock and gives concurrent workers different jobs", async () => {
    const state = snapshot();
    const queue = new OutboundJobQueue();
    await queue.upsert(planPartnerJobs(state), NOW);
    const [first, second] = await Promise.all([queue.claim("worker-a", 1, NOW), queue.claim("worker-b", 1, NOW)]);
    expect(first[0]?.id).toBeTruthy();
    expect(second[0]?.id).toBeTruthy();
    expect(first[0]?.id).not.toBe(second[0]?.id);

    const stuck = queue.jobs.find((job) => job.id === first[0]?.id) as OutboundJob;
    stuck.lockedAt = new Date(NOW.getTime() - 11 * 60_000).toISOString();
    const restarted = await queue.claim("worker-c", 1, new Date(NOW.getTime() + 60_000));
    expect(restarted.map((job) => job.id)).toContain(stuck.id);
    expect(queue.jobs.find((job) => job.id === stuck.id)?.lockedBy).toBe("worker-c");
  });

  it("does not call the partner after the outbound credential is revoked", async () => {
    const state = snapshot({ outboundCredentialActive: false });
    const { claimed } = await enqueueAndClaim(state);
    let calls = 0;
    const result = await advanceOutboundJob({
      job: claimed[0] as OutboundJob,
      snapshot: state,
      token: null,
      credentialState: "missing",
      now: NOW,
      deliver: async () => {
        calls += 1;
        return ok(200);
      },
    });
    expect(calls).toBe(0);
    expect(result.job.blockedReason).toBe("credential_revoked");
    expect(result.attempt?.error).toBe("credential_revoked");
  });

  it("lets an admin retry a failed job and rechecks a blocked extra shipment", async () => {
    const state = snapshot({
      fulfillments: [
        ...snapshot().fulfillments,
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          status: "CLOSED",
          trackingNumber: "1Z222",
          carrier: "UPS",
          shippedAt: "2026-10-20T18:00:00.000Z",
        },
      ],
    });
    const queue = new OutboundJobQueue();
    await queue.upsert(planPartnerJobs(state), NOW);
    const shipment = queue.jobs.find((job) => job.businessKey.endsWith("dddddddd-dddd-4ddd-8ddd-dddddddddddd")) as OutboundJob;
    shipment.status = "failed";
    shipment.attemptCount = 8;
    const manual = applyManualRetry(shipment, NOW);
    expect(manual.ok).toBe(true);
    if (!manual.ok) return;
    const index = queue.jobs.findIndex((job) => job.id === shipment.id);
    queue.jobs[index] = manual.job;
    let calls = 0;
    const retried = await advanceOutboundJob({
      job: { ...manual.job, status: "processing" },
      snapshot: state,
      token: "sandbox-token",
      now: NOW,
      deliver: async () => {
        calls += 1;
        return ok(200);
      },
    });
    expect(retried.job.status).toBe("succeeded");
    expect(calls).toBe(1);
    queue.jobs[index] = retried.job;

    const extra = queue.jobs.find((job) => job.blockedReason === "partner_single_shipment_limit") as OutboundJob;
    const extraRetry = await queue.retry(extra.id, NOW);
    expect(extraRetry.ok).toBe(true);
    if (!extraRetry.ok) return;
    const claimed = await queue.claim("admin-retry", 10, NOW);
    const claimedExtra = claimed.find((job) => job.businessKey.includes("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"));
    expect(claimedExtra).toBeTruthy();
    const blockedAgain = await advanceOutboundJob({
      job: claimedExtra as OutboundJob,
      snapshot: state,
      token: "sandbox-token",
      now: NOW,
      deliver: async () => {
        calls += 1;
        return ok(200);
      },
    });
    expect(blockedAgain.job.status).toBe("blocked");
    expect(blockedAgain.job.blockedReason).toBe("partner_single_shipment_limit");
    expect(calls).toBe(1);
    expect(applyManualRetry({ ...retried.job, status: "succeeded" }, NOW).ok).toBe(false);
  });

  it("never logs a bearer token or a payment url query", () => {
    const redacted = redactSyncText(
      "Authorization: Bearer super-secret-token https://pay.example.test/checkout?session=secret-session"
    );
    expect(redacted).not.toContain("super-secret-token");
    expect(redacted).not.toContain("secret-session");
    expect(redacted).toContain("Bearer [redacted]");
    expect(redacted).toContain("https://pay.example.test/checkout");
  });

  it("encrypts an outbound token so the plaintext is not the stored value", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const stored = encryptOutboundSecret("sandbox-bearer-token-value", key);
    expect(stored).toBeTruthy();
    expect(stored).not.toContain("sandbox-bearer-token-value");
    expect(decryptOutboundSecret(stored || "", key)).toBe("sandbox-bearer-token-value");
    expect(decryptOutboundSecret(stored || "", Buffer.alloc(32, 8).toString("base64"))).toBeNull();
  });

  it("sends an https payment link and one receipt per applied payment", async () => {
    expect(PAYMENT_LINK_SYNC_ENABLED).toBe(true);
    expect(PAYMENT_RECEIPT_SYNC_ENABLED).toBe(true);
    const waiting = planPartnerJobs(snapshot()).find((job) => job.eventType === "payment-link");
    expect(waiting?.waitReason).toBe("payment_link_not_ready");

    const state = snapshot({
      paymentLink: { url: "https://checkout.stripe.com/c/pay/cs_test_local", amountCents: 12500 },
      payments: [
        {
          id: "pay-1",
          externalPaymentId: "pi_test_card",
          amount: 40,
          paidAt: "2026-10-20T15:00:00.000Z",
          paymentMethod: "credit_card",
          confirmationCode: "ch_test_card",
        },
        {
          id: "pay-2",
          externalPaymentId: "pi_test_ach",
          amount: 50,
          paidAt: "2026-10-20T16:00:00.000Z",
          paymentMethod: "ach",
          confirmationCode: "ch_test_ach",
        },
      ],
    });
    const link = planPartnerJobs(state).find((job) => job.eventType === "payment-link");
    expect(link?.waitReason).toBe("payment_link_not_ready");
    const readyLink = planPartnerJobs({
      ...state,
      paymentLink: { url: "https://checkout.stripe.com/c/pay/cs_test_local", amountCents: 3500 },
    }).find((job) => job.eventType === "payment-link");
    expect(readyLink?.payload).toEqual({ payment_link_url: "https://checkout.stripe.com/c/pay/cs_test_local" });
    const receipts = planPartnerJobs(state).filter((job) => job.eventType === "payment");
    expect(receipts.map((job) => job.businessKey)).toEqual(["payment:pi_test_card", "payment:pi_test_ach"]);
    expect(receipts[0]?.payload.payment_date).toBe("2026-10-20");
    expect(receipts[1]?.payload.payment_date).toBe("2026-10-20");
    expect(JSON.stringify(receipts)).not.toMatch(/4242|cvc|card_number|routing/i);

    const calls: Array<{ url: string; method: string; body: string }> = [];
    await deliverFulfillmentCallback(
      {
        baseUrl: "https://sandbox.example.test",
        token: "sandbox-bearer-token-value",
        externalOrderNumber: "ORD-PARTNER-100",
        eventType: "payment-link",
        businessKey: "payment-link:inv",
        payload: {
          payment_link_url: "https://checkout.stripe.com/c/pay/cs_test_local?secret=1",
          card_number: "4242424242424242",
        },
      },
      (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: String(init?.method), body: String(init?.body) });
        return new Response("{}", { status: 200 });
      }) as typeof fetch
    );
    await deliverFulfillmentCallback(
      {
        baseUrl: "https://sandbox.example.test",
        token: "sandbox-bearer-token-value",
        externalOrderNumber: "ORD-PARTNER-100",
        eventType: "payment",
        businessKey: "payment:pi_test_card",
        payload: receipts[0]!.payload,
      },
      (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: String(init?.method), body: String(init?.body) });
        return new Response("{}", { status: 500 });
      }) as typeof fetch
    );
    expect(calls[0]?.url).toBe("https://sandbox.example.test/api/integrations/v1/orders/ORD-PARTNER-100/payment-link");
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.body).toContain("https://checkout.stripe.com/c/pay/cs_test_local?secret=1");
    expect(calls[0]?.body).not.toContain("4242");
    expect(calls[0]?.body).not.toContain("card_number");
    expect(calls[1]?.method).toBe("PUT");
    expect(calls[1]?.url).toBe("https://sandbox.example.test/api/integrations/v1/orders/ORD-PARTNER-100/payments/pi_test_card");
    expect(calls[1]?.body).toContain("credit_card");
    expect(calls[1]?.body).not.toContain("pi_test_card");

    const retried = await advanceOutboundJob({
      job: {
        ...(receipts[0] as PlannedJob),
        id: "job-payment",
        payloadHash: "old",
        status: "pending",
        attemptCount: 0,
        maxAttempts: 8,
        nextAttemptAt: NOW.toISOString(),
        lockedAt: null,
        lockedBy: null,
        lastHttpStatus: null,
        lastError: null,
        updatedAt: NOW.toISOString(),
      },
      snapshot: state,
      token: "sandbox-token",
      now: NOW,
      deliver: async () => ok(500),
    });
    expect(retried.job.status).toBe("pending");
    expect(retried.job.attemptCount).toBe(1);
    expect(redactSyncText("paid https://checkout.stripe.com/c/pay/cs_test_secret")).toBe("paid [redacted-payment-url]");
  });

  it("delivers a replacement payment link after a partial payment", async () => {
    const queue = new OutboundJobQueue();
    const original = snapshot({
      paymentLink: { url: "https://checkout.stripe.com/c/pay/cs_first", amountCents: 12500 },
    });
    await queue.upsert(planPartnerJobs(original), NOW);
    const first = queue.jobs.find((job) => job.eventType === "payment-link") as OutboundJob;
    first.status = "succeeded";
    first.lastHttpStatus = 200;
    const replacement = snapshot({
      paymentLink: { url: "https://checkout.stripe.com/c/pay/cs_second", amountCents: 5000 },
      payments: [
        {
          id: "pay-1",
          externalPaymentId: "pi_test_card",
          amount: 75,
          paidAt: "2026-10-20T15:00:00.000Z",
          paymentMethod: "credit_card",
          confirmationCode: "ch_test_card",
        },
      ],
    });
    await queue.upsert(planPartnerJobs(replacement), new Date(NOW.getTime() + 1000));
    const next = queue.jobs.find((job) => job.eventType === "payment-link" && !job.businessKey.endsWith(":revision")) as OutboundJob;
    expect(next.status).toBe("pending");
    expect(next.lastHttpStatus).toBeNull();
    const calls: string[] = [];
    const result = await advanceOutboundJob({
      job: next,
      snapshot: replacement,
      token: "sandbox-token",
      now: new Date(NOW.getTime() + 1000),
      deliver: async (request) => {
        calls.push(String(request.payload.payment_link_url));
        return ok(200);
      },
    });
    expect(result.delivered).toBe(true);
    expect(calls).toEqual(["https://checkout.stripe.com/c/pay/cs_second"]);
  });

  it("does not send a receipt before the invoice callback is accepted", async () => {
    const state = snapshot({
      payments: [
        {
          id: "pay-1",
          externalPaymentId: "pi_test_card",
          amount: 40,
          paidAt: "2026-10-21T12:00:00.000Z",
          paymentMethod: "credit_card",
          confirmationCode: "ch_test_card",
        },
      ],
    });
    const queue = new OutboundJobQueue();
    await queue.upsert(planPartnerJobs(state), NOW);
    const receipt = queue.jobs.find((job) => job.eventType === "payment") as OutboundJob;
    let calls = 0;
    const held = await advanceOutboundJob({
      job: receipt,
      snapshot: state,
      token: "sandbox-token",
      invoiceAcceptance: "pending",
      now: NOW,
      deliver: async () => {
        calls += 1;
        return ok(200);
      },
    });
    expect(calls).toBe(0);
    expect(held.delivered).toBe(false);
    expect(held.job.status).toBe("pending");
    expect(held.job.waitReason).toBe("invoice_not_accepted");
    expect(held.job.attemptCount).toBe(receipt.attemptCount);
    const sent = await advanceOutboundJob({
      job: receipt,
      snapshot: state,
      token: "sandbox-token",
      invoiceAcceptance: "accepted",
      now: new Date(NOW.getTime() + 1000),
      deliver: async () => {
        calls += 1;
        return ok(200);
      },
    });
    expect(calls).toBe(1);
    expect(sent.delivered).toBe(true);
    expect(sent.job.status).toBe("succeeded");
  });

  it("refuses a production callback and an unauthorized worker", async () => {
    const state = snapshot({ partnerEnvironment: "production" });
    const { claimed } = await enqueueAndClaim(state);
    let calls = 0;
    const result = await advanceOutboundJob({
      job: claimed[0] as OutboundJob,
      snapshot: state,
      token: "live-token",
      now: NOW,
      deliver: async () => {
        calls += 1;
        return ok(200);
      },
    });
    expect(calls).toBe(0);
    expect(result.job.blockedReason).toBe("production_callbacks_disabled");
    expect(authorizeOutboundWorker("Bearer correct-secret", "correct-secret")).toBe(true);
    expect(authorizeOutboundWorker("Bearer wrong-secret", "correct-secret")).toBe(false);
    expect(authorizeOutboundWorker(null, "correct-secret")).toBe(false);
    expect(outboundDeliveryEnabled("true")).toBe(true);
    expect(outboundDeliveryEnabled(undefined)).toBe(false);
  });
});

describe("missed synchronization recovery", () => {
  it("selects an older order that is missing a shipment and ignores a current succeeded order", () => {
    expect(
      orderNeedsFulfillmentSync({
        invoices: [{ id: "inv-old", kind: "PRIMARY", voided: false, total: 100 }],
        fulfillments: [{ id: "ful-old", status: "CLOSED", trackingNumber: "1Z999" }],
        jobs: [
          {
            eventType: "invoice",
            businessKey: "invoice:inv-old",
            status: "succeeded",
            payload: { final_total: 100 },
          },
        ],
      })
    ).toBe(true);

    expect(
      orderNeedsFulfillmentSync({
        invoices: [{ id: "inv-current", kind: "PRIMARY", voided: false, total: 100 }],
        fulfillments: [{ id: "ful-current", status: "CLOSED", trackingNumber: "1Z100" }],
        jobs: [
          {
            eventType: "invoice",
            businessKey: "invoice:inv-current",
            status: "succeeded",
            payload: { final_total: 100 },
          },
          {
            eventType: "shipment",
            businessKey: "shipment:ful-current",
            status: "succeeded",
            payload: { tracking_number: "1Z100" },
          },
        ],
      })
    ).toBe(false);

    expect(
      orderNeedsFulfillmentSync({
        invoices: [{ id: "inv-changed", kind: "PRIMARY", voided: false, total: 140 }],
        fulfillments: [],
        jobs: [
          {
            eventType: "invoice",
            businessKey: "invoice:inv-changed",
            status: "succeeded",
            payload: { final_total: 100 },
          },
        ],
      })
    ).toBe(true);
  });

  it("asks the database for every order with a missing callback, including orders past the first page", async () => {
    const synced: string[] = [];
    let calls = 0;
    const sb = {
      rpc: async () => {
        calls += 1;
        if (calls === 1) {
          return {
            data: [{ order_id: "order-older-than-the-first-page" }],
            error: null,
          };
        }
        return { data: [], error: null };
      },
      from() {
        throw new Error("The recent-row fallback should not run when the reconcile function is available.");
      },
    };
    const count = await reconcileOutboundOrders(sb as never, NOW, async (_db, orderId) => {
      synced.push(orderId);
    });
    expect(count).toBe(1);
    expect(synced).toEqual(["order-older-than-the-first-page"]);
  });
});

describe("partner fulfillment scheduling", () => {
  it("writes an outbox job for a mapped partner order and ignores an unrelated order", async () => {
    const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
    const tables: Record<string, any[]> = {
      integration_partner_orders: [
        { partner_id: PARTNER, external_order_number: "ORD-PARTNER-100", order_id: ORDER },
      ],
      integration_partners: [
        {
          id: PARTNER,
          environment: "sandbox",
          status: "active",
          callback_base_url: "https://sandbox.example.test",
          adapter_code: "fulfillment-callbacks-v1",
        },
      ],
      integration_credentials: [{ id: "cred", partner_id: PARTNER, direction: "outbound", active: true, revoked_at: null }],
      orders: [{ id: ORDER, status: "INVOICED", total: 125, shipping_total: 25, bulk_mode: false }],
      invoices: [
        {
          id: INVOICE,
          order_id: ORDER,
          invoice_number: "INV-100",
          invoice_kind: "PRIMARY",
          status: "ISSUED",
          total: 125,
          issued_at: "2026-10-20T14:00:00.000Z",
          voided_at: null,
        },
      ],
      fulfillments: [
        {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          order_id: ORDER,
          status: "CLOSED",
          tracking_number: "1Z111",
          dropship_tracking_number: null,
          dropship_carrier: null,
          shipped_at: "2026-10-20T13:00:00.000Z",
          closed_at: "2026-10-20T13:00:00.000Z",
          metadata: { shipping: { carrier: "FedEx", tracking_number: "1Z111" } },
        },
      ],
      integration_outbound_jobs: [],
    };

    function from(table: string) {
      const rows = tables[table] ?? [];
      const filters: Array<(row: any) => boolean> = [];
      const builder: any = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          filters.push((row) => row[column] === value);
          return builder;
        },
        is: (column: string, value: unknown) => {
          filters.push((row) => row[column] === value);
          return builder;
        },
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({ data: rows.find((row) => filters.every((filter) => filter(row))) ?? null, error: null }),
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          rows.push(row);
          return Promise.resolve({ error: null });
        },
        update: () => builder,
        then: (resolve: (value: { data: any[]; error: null }) => unknown) =>
          resolve({ data: rows.filter((row) => filters.every((filter) => filter(row))), error: null }),
      };
      return builder;
    }

    await schedulePartnerFulfillmentSync({ from }, ORDER);
    await schedulePartnerFulfillmentSync({ from }, "ffffffff-ffff-4fff-8fff-ffffffffffff");
    const events = inserts.filter((row) => row.table === "integration_outbound_jobs").map((row) => row.row.event_type);
    expect(events.sort()).toEqual(["invoice", "payment-link", "shipment"]);
    expect(inserts.every((row) => row.row.external_order_number === "ORD-PARTNER-100" || row.table !== "integration_outbound_jobs")).toBe(
      true
    );
    expect(JSON.stringify(inserts)).not.toContain("sandbox-bearer");
  });
});
