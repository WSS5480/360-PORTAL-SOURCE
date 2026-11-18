/**
 * Deliver ORD-DEMO-1002 callbacks one at a time through the production outbox
 * adapter. Does not enable the global worker and does not claim unrelated jobs.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { deliverFulfillmentCallback } from "@/lib/integrations/outbound/callbackAdapter";
import { decryptOutboundSecret } from "@/lib/integrations/outbound/credentialCipher";
import { callbackPath } from "@/lib/integrations/outbound/payload";
import { advanceOutboundJob, type InvoiceAcceptance } from "@/lib/integrations/outbound/processOutboundJob";
import { loadFulfillmentSnapshot } from "@/lib/integrations/outbound/schedulePartnerFulfillmentSync";
import { redactSyncText } from "@/lib/integrations/outbound/redact";
import type { AttemptRecord, OutboundJob, SyncEventType } from "@/lib/integrations/outbound/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXTERNAL_ORDER = "ORD-DEMO-1002";
const WORKER_ID = "ord-demo-1002-controlled";
const FORBIDDEN = ["supabase.360medical.net", "app.360medical.net", "sk_live_", "pk_live_", "rk_live_"];

function stagingOrigin(): string {
  const value = String(process.env.NIMBLE_STAGING_CALLBACK_URL || "").trim().replace(/\/$/, "");
  if (!value) {
    throw new Error("Set NIMBLE_STAGING_CALLBACK_URL in .env.local.test to the https callback origin for this lab.");
  }
  return value;
}

function loadTestEnv() {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path.join(root, ".env.local.test"), "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  const joined = Object.values(env).join("\n");
  for (const marker of FORBIDDEN) {
    if (joined.includes(marker)) throw new Error(`Refusing production marker ${marker}`);
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321") {
    throw new Error("Supabase URL is not the local stack.");
  }
  if (env.INTEGRATION_OUTBOUND_ENABLED === "true") {
    throw new Error("Global outbound delivery is enabled. Leave it disabled for this controlled run.");
  }
  if (!String(env.STRIPE_SECRET_KEY || "").startsWith("sk_test_")) {
    throw new Error("Stripe secret is not a test key.");
  }
  if (env.FEDEX_ENV === "production") throw new Error("FedEx is set to production.");
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  return env;
}

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

function methodFor(eventType: SyncEventType): "PATCH" | "PUT" {
  return eventType === "payment" ? "PUT" : "PATCH";
}

function publicReport(body: string | null) {
  const redacted = redactSyncText(body);
  let parsed: unknown = null;
  if (redacted) {
    try {
      parsed = JSON.parse(redacted);
    } catch {
      parsed = redacted;
    }
  }
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    return {
      request_id: record.request_id ?? record.requestId ?? null,
      error: record.error ?? record.detail ?? null,
      ok: record.ok ?? null,
    };
  }
  return { request_id: null, error: parsed, ok: null };
}

type Capture = {
  method: string;
  path: string;
  origin: string;
  status: number | null;
  requestId: string | null;
  body: ReturnType<typeof publicReport>;
  sent: boolean;
};

function guardedFetch(capture: Capture): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== stagingOrigin()) {
      throw new Error(`Refusing callback host ${url.origin}`);
    }
    if (url.protocol !== "https:") throw new Error("Refusing non-HTTPS callback.");
    if (!url.pathname.includes(`/${EXTERNAL_ORDER}/`)) {
      throw new Error("Refusing callback for an order other than ORD-DEMO-1002.");
    }
    capture.method = String(init?.method || "GET").toUpperCase();
    capture.path = url.pathname;
    capture.origin = url.origin;
    capture.sent = true;
    const response = await fetch(input, init);
    const raw = await response.text().catch(() => "");
    capture.status = response.status;
    capture.requestId =
      response.headers.get("x-request-id") ||
      response.headers.get("x-correlation-id") ||
      response.headers.get("request-id");
    capture.body = publicReport(raw);
    return new Response(raw, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

function outcome(status: number | null, sent: boolean, jobStatus: string): "accepted" | "rejected" | "not sent" {
  if (!sent || status == null) return "not sent";
  if (status === 200 && jobStatus === "succeeded") return "accepted";
  return "rejected";
}

async function main() {
  loadTestEnv();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: partner, error: partnerError } = await sb
    .from("integration_partners")
    .select("id, environment, status, callback_base_url")
    .eq("code", "nimble")
    .eq("environment", "sandbox")
    .maybeSingle();
  if (partnerError || !partner) throw new Error("Local Nimble sandbox partner was not found.");
  if (partner.environment !== "sandbox") throw new Error("Partner is not sandbox.");
  if (partner.callback_base_url !== stagingOrigin()) {
    throw new Error("Callback URL is not Nimble staging.");
  }

  const { data: cred } = await sb
    .from("integration_credentials")
    .select("secret_ciphertext")
    .eq("partner_id", partner.id)
    .eq("direction", "outbound")
    .eq("active", true)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const token = decryptOutboundSecret(String(cred?.secret_ciphertext || ""));
  if (!token) throw new Error("Outbound staging credential could not be decrypted.");
  const envKey = String(process.env.NIMBLE_STAGING_KEY || "").trim();
  if (!envKey || token !== envKey) {
    throw new Error("Stored outbound credential does not match NIMBLE_STAGING_KEY.");
  }

  const sequence: SyncEventType[] = ["invoice", "shipment", "payment-link", "payment"];
  const reports: Array<Record<string, unknown>> = [];
  let invoiceAccepted = false;
  let stopReason: string | null = null;

  for (const eventType of sequence) {
    if (stopReason || (eventType !== "invoice" && !invoiceAccepted)) {
      reports.push({
        event_type: eventType,
        endpoint: `${methodFor(eventType)} ${callbackPath(eventType, EXTERNAL_ORDER, eventType === "payment" ? "payment:pi_test_ord_demo_1002" : undefined)}`,
        http_status: null,
        result: "not sent",
        reason: stopReason || "invoice_not_accepted",
      });
      continue;
    }

    const { data: row, error } = await sb
      .from("integration_outbound_jobs")
      .select("*")
      .eq("external_order_number", EXTERNAL_ORDER)
      .eq("event_type", eventType)
      .eq("status", "pending")
      .maybeSingle();
    if (error || !row) {
      reports.push({
        event_type: eventType,
        endpoint: `${methodFor(eventType)} ${callbackPath(eventType, EXTERNAL_ORDER)}`,
        http_status: null,
        result: "not sent",
        reason: error?.message || "pending_job_missing",
      });
      stopReason = error?.message || "pending_job_missing";
      continue;
    }

    const now = new Date();
    const claimed = await sb
      .from("integration_outbound_jobs")
      .update({
        status: "processing",
        locked_at: now.toISOString(),
        locked_by: WORKER_ID,
        updated_at: now.toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "pending")
      .eq("external_order_number", EXTERNAL_ORDER)
      .select("*")
      .maybeSingle();
    if (claimed.error || !claimed.data) {
      reports.push({
        event_type: eventType,
        endpoint: `${methodFor(eventType)} ${callbackPath(eventType, EXTERNAL_ORDER, row.business_key)}`,
        http_status: null,
        result: "not sent",
        reason: "claim_failed",
      });
      stopReason = "claim_failed";
      continue;
    }

    const job = rowToJob(claimed.data);
    const snapshot = await loadFulfillmentSnapshot(sb, job.orderId);
    if (!snapshot || snapshot.externalOrderNumber !== EXTERNAL_ORDER) {
      await sb
        .from("integration_outbound_jobs")
        .update({
          status: "pending",
          locked_at: null,
          locked_by: null,
          last_error: "snapshot_unavailable",
          updated_at: now.toISOString(),
        })
        .eq("id", job.id)
        .eq("status", "processing");
      reports.push({
        event_type: eventType,
        http_status: null,
        result: "not sent",
        reason: "snapshot_unavailable",
      });
      stopReason = "snapshot_unavailable";
      continue;
    }
    if (snapshot.callbackBaseUrl !== stagingOrigin()) {
      throw new Error("Snapshot callback host is not Nimble staging.");
    }
    if (snapshot.partnerEnvironment === "production") {
      throw new Error("Refusing production partner callbacks.");
    }

    const capture: Capture = {
      method: methodFor(eventType),
      path: callbackPath(eventType, EXTERNAL_ORDER, job.businessKey),
      origin: stagingOrigin(),
      status: null,
      requestId: null,
      body: { request_id: null, error: null, ok: null },
      sent: false,
    };
    const invoiceAcceptance: InvoiceAcceptance = eventType === "invoice" ? "pending" : invoiceAccepted ? "accepted" : "pending";
    let advanced;
    try {
      advanced = await advanceOutboundJob({
        job,
        snapshot,
        token,
        credentialState: "active",
        invoiceAcceptance,
        now,
        deliver: (request) => deliverFulfillmentCallback(request, guardedFetch(capture)),
      });
    } catch (error) {
      await sb
        .from("integration_outbound_jobs")
        .update({
          status: "pending",
          locked_at: null,
          locked_by: null,
          last_error: "worker_exception",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("status", "processing");
      reports.push({
        event_type: eventType,
        endpoint: `${capture.method} ${capture.path}`,
        http_status: capture.status,
        result: "not sent",
        reason: error instanceof Error ? error.message : "worker_exception",
      });
      stopReason = "worker_exception";
      continue;
    }

    const attempt: AttemptRecord | null = advanced.attempt;
    await sb
      .from("integration_outbound_jobs")
      .update({
        payload: advanced.job.payload,
        payload_hash: advanced.job.payloadHash,
        status: advanced.job.status,
        attempt_count: advanced.job.attemptCount,
        next_attempt_at: advanced.job.nextAttemptAt,
        locked_at: null,
        locked_by: null,
        last_http_status: advanced.job.lastHttpStatus,
        last_error: advanced.job.lastError,
        blocked_reason: advanced.job.blockedReason,
        updated_at: advanced.job.updatedAt,
      })
      .eq("id", job.id);
    if (attempt) {
      await sb.from("integration_outbound_attempts").insert({
        job_id: attempt.jobId,
        attempted_at: attempt.attemptedAt,
        http_status: attempt.httpStatus,
        response_excerpt: attempt.responseExcerpt,
        error: attempt.error,
        duration_ms: attempt.durationMs,
      });
    }

    const result = outcome(capture.status, capture.sent, advanced.job.status);
    if (eventType === "invoice" && result === "accepted") invoiceAccepted = true;

    reports.push({
      event_type: eventType,
      endpoint: `${capture.method} ${capture.path}`,
      http_status: capture.status,
      result,
      validation_errors: capture.body.error,
      request_id: capture.requestId || capture.body.request_id,
      local_outbox: {
        status: advanced.job.status,
        delivered: advanced.delivered,
        last_http_status: advanced.job.lastHttpStatus,
        last_error: advanced.job.lastError,
        blocked_reason: advanced.job.blockedReason,
        wait_reason: advanced.job.waitReason,
      },
    });

    if (result !== "accepted") {
      stopReason = `${eventType}_${result}`;
    }
  }

  console.log(JSON.stringify({ outbound_enabled: process.env.INTEGRATION_OUTBOUND_ENABLED, callbacks: reports }, null, 2));
}

await main();
