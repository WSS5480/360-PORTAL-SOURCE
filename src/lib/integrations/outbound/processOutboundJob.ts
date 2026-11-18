import { nextAttemptAt, waitUntil } from "@/lib/integrations/outbound/backoff";
import { deliverFulfillmentCallback, type CallbackRequest } from "@/lib/integrations/outbound/callbackAdapter";
import { payloadHash } from "@/lib/integrations/outbound/payload";
import { adapterSupported, planPartnerJobs } from "@/lib/integrations/outbound/planPartnerJobs";
import { redactSyncText } from "@/lib/integrations/outbound/redact";
import type { AttemptRecord, FulfillmentSnapshot, OutboundJob } from "@/lib/integrations/outbound/types";

export type AdvanceResult = {
  job: OutboundJob;
  attempt: AttemptRecord | null;
  delivered: boolean;
};

function blocked(job: OutboundJob, reason: string, now: Date): AdvanceResult {
  return {
    delivered: false,
    attempt: {
      jobId: job.id,
      attemptedAt: now.toISOString(),
      httpStatus: null,
      responseExcerpt: null,
      error: reason,
      durationMs: 0,
    },
    job: {
      ...job,
      status: "blocked",
      blockedReason: reason,
      waitReason: null,
      lastError: reason,
      lockedAt: null,
      lockedBy: null,
      updatedAt: now.toISOString(),
    },
  };
}

function dependencyWait(job: OutboundJob, reason: string, now: Date): AdvanceResult {
  return {
    delivered: false,
    attempt: null,
    job: {
      ...job,
      status: "pending",
      waitReason: reason,
      lastError: reason,
      nextAttemptAt: nextAttemptAt(1, now).toISOString(),
      lockedAt: null,
      lockedBy: null,
      updatedAt: now.toISOString(),
    },
  };
}

function waiting(job: OutboundJob, reason: string, now: Date): AdvanceResult {
  return {
    delivered: false,
    attempt: null,
    job: {
      ...job,
      status: "pending",
      waitReason: reason,
      lastError: reason,
      nextAttemptAt: waitUntil(now).toISOString(),
      lockedAt: null,
      lockedBy: null,
      updatedAt: now.toISOString(),
    },
  };
}

function transportBlock(
  snapshot: FulfillmentSnapshot,
  token: string | null,
  credentialState: "active" | "missing" | "unreadable"
): string | null {
  if (snapshot.partnerEnvironment === "production") return "production_callbacks_disabled";
  if (snapshot.partnerStatus !== "active") return "partner_inactive";
  if (!adapterSupported(snapshot.adapterCode)) return "adapter_not_configured";
  if (!snapshot.callbackBaseUrl) return "callback_url_missing";
  if (credentialState === "unreadable") return "credential_unreadable";
  if (!snapshot.outboundCredentialActive || credentialState === "missing" || !token) return "credential_revoked";
  return null;
}

export type InvoiceAcceptance = "accepted" | "pending" | "blocked" | "missing";

export async function advanceOutboundJob(input: {
  job: OutboundJob;
  snapshot: FulfillmentSnapshot;
  token: string | null;
  credentialState?: "active" | "missing" | "unreadable";
  /** Omit in tests that deliver one callback. The worker sets this so a receipt cannot precede an accepted invoice. */
  invoiceAcceptance?: InvoiceAcceptance;
  now: Date;
  deliver?: (request: CallbackRequest) => Promise<Awaited<ReturnType<typeof deliverFulfillmentCallback>>>;
}): Promise<AdvanceResult> {
  const { job, snapshot, now } = input;
  if (job.businessKey.endsWith(":revision")) {
    return blocked(job, job.blockedReason || "partner_payload_changed_after_sync", now);
  }
  const planned = planPartnerJobs(snapshot).find(
    (item) => item.eventType === job.eventType && item.businessKey === job.businessKey
  );
  if (!planned) {
    return blocked(job, "sync_fact_withdrawn", now);
  }
  if (planned.status === "blocked") return blocked({ ...job, payload: planned.payload }, planned.blockedReason || "blocked", now);
  if (planned.waitReason) return waiting({ ...job, payload: planned.payload, payloadHash: payloadHash(planned.payload) }, planned.waitReason, now);

  const hash = payloadHash(planned.payload);
  const needsInvoice = job.eventType === "payment" || job.eventType === "payment-link";
  const alreadyDelivered = job.payloadHash === hash && job.lastHttpStatus === 200;
  if (needsInvoice && input.invoiceAcceptance && input.invoiceAcceptance !== "accepted" && !alreadyDelivered) {
    if (input.invoiceAcceptance === "blocked") return blocked({ ...job, payload: planned.payload, payloadHash: hash }, "invoice_not_accepted", now);
    return dependencyWait({ ...job, payload: planned.payload, payloadHash: hash }, "invoice_not_accepted", now);
  }

  if (job.payloadHash === hash && job.lastHttpStatus === 200) {
    return {
      delivered: false,
      attempt: null,
      job: {
        ...job,
        payload: planned.payload,
        status: "succeeded",
        blockedReason: null,
        waitReason: null,
        lockedAt: null,
        lockedBy: null,
        updatedAt: now.toISOString(),
      },
    };
  }

  const refusal = transportBlock(snapshot, input.token, input.credentialState ?? (input.token ? "active" : "missing"));
  if (refusal) return blocked({ ...job, payload: planned.payload, payloadHash: hash }, refusal, now);

  const deliver =
    input.deliver ??
    ((request: CallbackRequest) => deliverFulfillmentCallback(request, fetch));
  const started = Date.now();
  const result = await deliver({
    baseUrl: snapshot.callbackBaseUrl || "",
    token: input.token || "",
    externalOrderNumber: snapshot.externalOrderNumber,
    eventType: job.eventType,
    businessKey: job.businessKey,
    payload: planned.payload,
  });
  const durationMs = Date.now() - started;
  const attempt: AttemptRecord = {
    jobId: job.id,
    attemptedAt: now.toISOString(),
    httpStatus: result.httpStatus,
    responseExcerpt: redactSyncText(result.excerpt),
    error: redactSyncText(result.error),
    durationMs,
  };

  if (result.httpStatus === 200) {
    return {
      delivered: true,
      attempt,
      job: {
        ...job,
        payload: planned.payload,
        payloadHash: hash,
        status: "succeeded",
        blockedReason: null,
        waitReason: null,
        lastHttpStatus: 200,
        lastError: null,
        lockedAt: null,
        lockedBy: null,
        updatedAt: now.toISOString(),
      },
    };
  }

  if (result.terminal) {
    return {
      delivered: true,
      attempt,
      job: {
        ...job,
        payload: planned.payload,
        payloadHash: hash,
        status: "blocked",
        blockedReason: result.httpStatus === 409 ? "partner_conflict" : result.httpStatus === 422 ? "partner_rejected" : result.error,
        lastHttpStatus: result.httpStatus,
        lastError: result.error,
        lockedAt: null,
        lockedBy: null,
        updatedAt: now.toISOString(),
      },
    };
  }

  const attemptCount = job.attemptCount + 1;
  const exhausted = attemptCount >= job.maxAttempts || !result.retryable;
  return {
    delivered: true,
    attempt,
    job: {
      ...job,
      payload: planned.payload,
      payloadHash: hash,
      attemptCount,
      status: exhausted ? "failed" : "pending",
      lastHttpStatus: result.httpStatus,
      lastError: result.error,
      nextAttemptAt: exhausted ? job.nextAttemptAt : nextAttemptAt(attemptCount, now).toISOString(),
      lockedAt: null,
      lockedBy: null,
      updatedAt: now.toISOString(),
    },
  };
}
