import { nextAttemptAt } from "@/lib/integrations/outbound/backoff";
import { deliverFulfillmentCallback } from "@/lib/integrations/outbound/callbackAdapter";
import { decryptOutboundSecret } from "@/lib/integrations/outbound/credentialCipher";
import { advanceOutboundJob, type InvoiceAcceptance } from "@/lib/integrations/outbound/processOutboundJob";
import {
  loadFulfillmentSnapshot,
  syncPartnerFulfillmentForOrder,
} from "@/lib/integrations/outbound/schedulePartnerFulfillmentSync";
import type { AttemptRecord, OutboundJob } from "@/lib/integrations/outbound/types";

type Db = {
  from: (table: any) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: { message?: string } | null }>;
};

function text(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function rowToJob(row: any): OutboundJob {
  return {
    id: String(row.id),
    partnerId: String(row.partner_id),
    orderId: String(row.order_id),
    externalOrderNumber: String(row.external_order_number),
    eventType: row.event_type,
    businessKey: String(row.business_key),
    payload: row.payload && typeof row.payload === "object" ? row.payload : {},
    payloadHash: text(row.payload_hash),
    status: row.status,
    blockedReason: text(row.blocked_reason),
    waitReason: null,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 8),
    nextAttemptAt: String(row.next_attempt_at),
    lockedAt: text(row.locked_at),
    lockedBy: text(row.locked_by),
    lastHttpStatus: row.last_http_status == null ? null : Number(row.last_http_status),
    lastError: text(row.last_error),
    updatedAt: String(row.updated_at),
  };
}

async function outboundToken(sb: Db, partnerId: string): Promise<{ token: string | null; unreadable: boolean }> {
  const result = await sb
    .from("integration_credentials")
    .select("secret_ciphertext")
    .eq("partner_id", partnerId)
    .eq("direction", "outbound")
    .eq("active", true)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ciphertext = text(result.data?.secret_ciphertext);
  if (!ciphertext) return { token: null, unreadable: false };
  const token = decryptOutboundSecret(ciphertext);
  return token ? { token, unreadable: false } : { token: null, unreadable: true };
}

async function releaseClaim(sb: Db, job: OutboundJob, reason: string, now: Date): Promise<void> {
  const attemptCount = job.attemptCount + 1;
  const exhausted = attemptCount >= job.maxAttempts;
  await sb
    .from("integration_outbound_jobs")
    .update({
      status: exhausted ? "failed" : "pending",
      attempt_count: attemptCount,
      locked_at: null,
      locked_by: null,
      last_error: reason,
      next_attempt_at: exhausted ? job.nextAttemptAt : nextAttemptAt(attemptCount, now).toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", job.id)
    .eq("status", "processing");
}

async function fallbackOrderIds(sb: Db, limit: number): Promise<string[]> {
  const result = await sb
    .from("integration_partner_orders")
    .select("order_id")
    .not("order_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (result.error) return [];
  return (result.data ?? []).map((row: { order_id?: string }) => String(row.order_id || "")).filter(Boolean);
}

/** Rebuilds missing callback rows for every eligible partner order, including orders older than one worker page. */
export async function reconcileOutboundOrders(
  sb: Db,
  now = new Date(),
  sync: (db: Db, orderId: string, at: Date) => Promise<void> = syncPartnerFulfillmentForOrder
): Promise<number> {
  const seen = new Set<string>();
  let synced = 0;
  for (let batch = 0; batch < 20 && seen.size < 2000; batch += 1) {
    const listed = await sb.rpc("integration_list_orders_needing_sync", { p_limit: 100 });
    let ids: string[] = [];
    if (!listed.error && Array.isArray(listed.data)) {
      ids = listed.data
        .map((row: { order_id?: string } | string) => (typeof row === "string" ? row : String(row?.order_id || "")))
        .filter(Boolean);
    } else if (batch === 0) {
      ids = await fallbackOrderIds(sb, 2000);
    }
    const fresh = ids.filter((id) => !seen.has(id));
    if (!fresh.length) break;
    for (const orderId of fresh) {
      seen.add(orderId);
      await sync(sb, orderId, now);
      synced += 1;
    }
    if (listed.error || ids.length < 100) break;
  }
  return synced;
}

async function invoiceAcceptanceFor(sb: Db, orderId: string, acceptedInvoices: Set<string>): Promise<InvoiceAcceptance> {
  if (acceptedInvoices.has(orderId)) return "accepted";
  const result = await sb.from("integration_outbound_jobs").select("status, business_key").eq("order_id", orderId).eq("event_type", "invoice");
  const jobs = (result.data ?? []).filter((row: { business_key?: string }) => !String(row.business_key || "").endsWith(":revision"));
  if (jobs.some((row: { status?: string }) => row.status === "succeeded")) return "accepted";
  if (jobs.some((row: { status?: string }) => row.status === "pending" || row.status === "processing" || row.status === "failed")) {
    return "pending";
  }
  if (jobs.some((row: { status?: string }) => row.status === "blocked")) return "blocked";
  return "missing";
}

async function saveJob(sb: Db, job: OutboundJob, attempt: AttemptRecord | null): Promise<void> {
  const updated = await sb
    .from("integration_outbound_jobs")
    .update({
      payload: job.payload,
      payload_hash: job.payloadHash,
      status: job.status,
      attempt_count: job.attemptCount,
      next_attempt_at: job.nextAttemptAt,
      locked_at: null,
      locked_by: null,
      last_http_status: job.lastHttpStatus,
      last_error: job.lastError,
      blocked_reason: job.blockedReason,
      updated_at: job.updatedAt,
    })
    .eq("id", job.id);
  if (updated.error) throw new Error(updated.error.message || "outbound job save failed");
  if (!attempt) return;
  await sb.from("integration_outbound_attempts").insert({
    job_id: attempt.jobId,
    attempted_at: attempt.attemptedAt,
    http_status: attempt.httpStatus,
    response_excerpt: attempt.responseExcerpt,
    error: attempt.error,
    duration_ms: attempt.durationMs,
  });
}

export async function runOutboundWorker(
  sb: any,
  options: { workerId: string; limit?: number; now?: Date; fetchImpl?: typeof fetch } = { workerId: "worker" }
): Promise<{ processed: number; delivered: number }> {
  const now = options.now ?? new Date();
  await reconcileOutboundOrders(sb, now);

  const claimed = await sb.rpc("integration_claim_outbound_jobs", {
    p_worker_id: options.workerId,
    p_limit: options.limit ?? 10,
  });
  if (claimed.error) throw new Error(claimed.error.message || "outbound claim failed");

  let processed = 0;
  let delivered = 0;
  const tokens = new Map<string, { token: string | null; unreadable: boolean }>();
  const acceptedInvoices = new Set<string>();
  const eventRank: Record<string, number> = { invoice: 0, "payment-link": 1, shipment: 2, payment: 3 };
  const claimedRows = [...(claimed.data ?? [])].sort((left: { event_type?: string }, right: { event_type?: string }) => {
    return (eventRank[String(left.event_type)] ?? 9) - (eventRank[String(right.event_type)] ?? 9);
  });
  for (const row of claimedRows) {
    const job = rowToJob(row);
    try {
      const snapshot = await loadFulfillmentSnapshot(sb, job.orderId);
      if (!snapshot) {
        await releaseClaim(sb, job, "snapshot_unavailable", now);
        continue;
      }
      let secret = tokens.get(job.partnerId);
      if (!secret) {
        secret = await outboundToken(sb, job.partnerId);
        tokens.set(job.partnerId, secret);
      }
      const invoiceAcceptance = await invoiceAcceptanceFor(sb, job.orderId, acceptedInvoices);
      const advanced = await advanceOutboundJob({
        job,
        snapshot,
        token: secret.token,
        credentialState: secret.unreadable ? "unreadable" : secret.token ? "active" : "missing",
        invoiceAcceptance,
        now,
        deliver: options.fetchImpl
          ? (request) => deliverFulfillmentCallback(request, options.fetchImpl as typeof fetch)
          : undefined,
      });
      if (job.eventType === "invoice" && advanced.job.status === "succeeded") acceptedInvoices.add(job.orderId);
      await saveJob(sb, advanced.job, advanced.attempt);
      processed += 1;
      if (advanced.delivered) delivered += 1;
    } catch {
      await releaseClaim(sb, job, "worker_exception", now);
    }
  }
  return { processed, delivered };
}
