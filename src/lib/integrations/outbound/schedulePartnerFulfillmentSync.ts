import { mergePlannedJob } from "@/lib/integrations/outbound/jobQueue";
import { planPartnerJobs } from "@/lib/integrations/outbound/planPartnerJobs";
import type { FulfillmentSnapshot, OutboundJob } from "@/lib/integrations/outbound/types";

type Db = {
  from: (table: any) => any;
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: { message?: string; code?: string } | null }>;
};

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "PGRST205" || error.code === "42P01" || /schema cache|does not exist/i.test(message);
}

function text(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function trackingFrom(row: any): { trackingNumber: string | null; carrier: string | null; shippedAt: string | null } {
  const shipping = row?.metadata?.shipping && typeof row.metadata.shipping === "object" ? row.metadata.shipping : {};
  return {
    trackingNumber: text(row?.tracking_number) || text(row?.dropship_tracking_number) || text(shipping.tracking_number),
    carrier: text(row?.dropship_carrier) || text(shipping.carrier),
    shippedAt: text(row?.shipped_at) || text(row?.closed_at) || text(shipping.shipped_at),
  };
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

function jobToRow(job: OutboundJob): Record<string, unknown> {
  return {
    id: job.id,
    partner_id: job.partnerId,
    order_id: job.orderId,
    external_order_number: job.externalOrderNumber,
    event_type: job.eventType,
    business_key: job.businessKey,
    payload: job.payload,
    payload_hash: job.payloadHash,
    status: job.status,
    attempt_count: job.attemptCount,
    max_attempts: job.maxAttempts,
    next_attempt_at: job.nextAttemptAt,
    locked_at: job.lockedAt,
    locked_by: job.lockedBy,
    last_http_status: job.lastHttpStatus,
    last_error: job.lastError,
    blocked_reason: job.blockedReason,
    updated_at: job.updatedAt,
  };
}

export async function loadFulfillmentSnapshot(sb: any, orderId: string): Promise<FulfillmentSnapshot | null> {
  const linkResult = await sb
    .from("integration_partner_orders")
    .select("partner_id, external_order_number, order_id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (missingRelation(linkResult.error)) return null;
  if (linkResult.error) throw new Error(linkResult.error.message || "partner order lookup failed");
  if (!linkResult.data?.partner_id) return null;

  const partnerId = String(linkResult.data.partner_id);
  let partnerResult = await sb
    .from("integration_partners")
    .select("id, environment, status, callback_base_url, adapter_code")
    .eq("id", partnerId)
    .maybeSingle();
  if (partnerResult.error && /adapter_code/i.test(partnerResult.error.message || "")) {
    partnerResult = await sb
      .from("integration_partners")
      .select("id, environment, status, callback_base_url")
      .eq("id", partnerId)
      .maybeSingle();
    if (partnerResult.data) partnerResult.data.adapter_code = "fulfillment-callbacks-v1";
  }
  const [credentialResult, orderResult, invoiceResult, fulfillmentResult] = await Promise.all([
    sb
      .from("integration_credentials")
      .select("id")
      .eq("partner_id", partnerId)
      .eq("direction", "outbound")
      .eq("active", true)
      .is("revoked_at", null)
      .limit(1),
    sb.from("orders").select("id, status, total, shipping_total, bulk_mode").eq("id", orderId).maybeSingle(),
    sb
      .from("invoices")
      .select("id, invoice_number, invoice_kind, status, total, issued_at, voided_at, metadata")
      .eq("order_id", orderId),
    sb
      .from("fulfillments")
      .select("id, status, tracking_number, dropship_tracking_number, dropship_carrier, shipped_at, closed_at, metadata")
      .eq("order_id", orderId),
  ]);

  if (partnerResult.error || !partnerResult.data || orderResult.error || !orderResult.data) return null;
  const invoices = invoiceResult.error ? [] : (invoiceResult.data ?? []);
  const fulfillments = fulfillmentResult.error ? [] : (fulfillmentResult.data ?? []);
  const primary = (invoices as any[])
    .filter((row) => String(row.invoice_kind || "PRIMARY").toUpperCase() !== "SHIPPING_SUPPLEMENT")
    .filter((row) => !row.voided_at && String(row.status || "").toUpperCase() !== "VOID")
    .sort((left, right) => String(right.issued_at || "").localeCompare(String(left.issued_at || "")))[0];
  const supplements = (invoices as any[]).filter(
    (row) => String(row.invoice_kind || "").toUpperCase() === "SHIPPING_SUPPLEMENT" && !row.voided_at
  );
  const payments = await loadAppliedPayments(sb, primary?.id ? String(primary.id) : "");
  const checkout = primary?.metadata?.partner_checkout;
  const paymentLink =
    checkout && typeof checkout.url === "string"
      ? { url: checkout.url, amountCents: Number(checkout.amount_cents) || 0 }
      : null;

  return {
    partnerId,
    partnerEnvironment: partnerResult.data.environment === "production" ? "production" : "sandbox",
    partnerStatus: String(partnerResult.data.status || ""),
    adapterCode: String(partnerResult.data.adapter_code || "fulfillment-callbacks-v1"),
    callbackBaseUrl: text(partnerResult.data.callback_base_url),
    outboundCredentialActive: Array.isArray(credentialResult.data) && credentialResult.data.length > 0,
    orderId,
    externalOrderNumber: String(linkResult.data.external_order_number),
    orderStatus: String(orderResult.data.status || ""),
    orderTotal: Number(orderResult.data.total ?? 0),
    orderShippingTotal: Number(orderResult.data.shipping_total ?? 0),
    bulkMode: Boolean(orderResult.data.bulk_mode),
    openFulfillmentCount: (fulfillments as any[]).filter((row) => String(row.status || "").toUpperCase() === "OPEN").length,
    primaryInvoice: primary
      ? {
          id: String(primary.id),
          invoiceNumber: String(primary.invoice_number || ""),
          status: String(primary.status || ""),
          total: Number(primary.total ?? 0),
          issuedAt: text(primary.issued_at),
          voided: false,
          metadata: primary.metadata && typeof primary.metadata === "object" ? primary.metadata : null,
        }
      : null,
    shippingSupplementCount: supplements.length,
    paymentLink,
    payments,
    fulfillments: (fulfillments as any[]).map((row) => ({
      id: String(row.id),
      status: String(row.status || ""),
      ...trackingFrom(row),
    })),
  };
}

async function writeMergedJobs(sb: Db, orderId: string, snapshot: FulfillmentSnapshot, now: Date): Promise<void> {
  const existingResult = await sb.from("integration_outbound_jobs").select("*").eq("order_id", orderId);
  if (missingRelation(existingResult.error)) return;
  if (existingResult.error) throw new Error(existingResult.error.message || "outbound job lookup failed");
  const existing = new Map<string, OutboundJob>(
    (existingResult.data ?? []).map((row: any) => {
      const job = rowToJob(row);
      return [`${job.partnerId}:${job.eventType}:${job.businessKey}`, job] as const;
    })
  );

  for (const planned of planPartnerJobs(snapshot)) {
    const key = `${planned.partnerId}:${planned.eventType}:${planned.businessKey}`;
    const merged = mergePlannedJob(existing.get(key) ?? null, planned, now);
    if (merged.action === "insert") {
      const inserted = await sb.from("integration_outbound_jobs").insert(jobToRow(merged.job));
      if (inserted.error && !/duplicate|unique/i.test(inserted.error.message || "")) {
        throw new Error(inserted.error.message || "outbound job insert failed");
      }
      existing.set(key, merged.job);
    } else if (merged.action === "update") {
      const { id, ...patch } = jobToRow(merged.job);
      const updated = await sb.from("integration_outbound_jobs").update(patch).eq("id", id);
      if (updated.error) throw new Error(updated.error.message || "outbound job update failed");
      existing.set(key, merged.job);
    }
    if (merged.action === "keep-and-add") {
      const revision = mergePlannedJob(null, merged.extra, now);
      if (revision.action === "insert") {
        const revisionKey = `${revision.job.partnerId}:${revision.job.eventType}:${revision.job.businessKey}`;
        if (!existing.has(revisionKey)) {
          await sb.from("integration_outbound_jobs").insert(jobToRow(revision.job));
          existing.set(revisionKey, revision.job);
        }
      }
    }
  }
}

async function loadAppliedPayments(sb: any, invoiceId: string) {
  if (!invoiceId) return [];
  const selected = await sb
    .from("invoice_payments")
    .select("id, amount, note, payment_method, confirmation_code, external_payment_id, paid_at, created_at")
    .eq("invoice_id", invoiceId);
  const rows = selected?.error ? [] : (selected?.data ?? []);
  return (rows as any[]).map((row) => {
    const fromNote = String(row.note || "").startsWith("stripe:") ? String(row.note).slice("stripe:".length) : "";
    return {
      id: String(row.id),
      externalPaymentId: text(row.external_payment_id) || fromNote,
      amount: Number(row.amount ?? 0),
      paidAt: text(row.paid_at) || text(row.created_at) || "",
      paymentMethod: text(row.payment_method) || "",
      confirmationCode: text(row.confirmation_code) || "",
    };
  });
}

async function attachPaymentLink(sb: any, snapshot: FulfillmentSnapshot): Promise<FulfillmentSnapshot> {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key.startsWith("sk_") || process.env.VITEST) return snapshot;
  try {
    const { ensureInvoiceCheckoutLink } = await import("@/lib/integrations/outbound/ensurePaymentLink");
    return await ensureInvoiceCheckoutLink(sb, snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_failed";
    if (!/bearer|authorization|secret|sk_/i.test(message)) {
      console.error("[integration-outbound] payment link was not minted", message.slice(0, 180));
    }
    return snapshot;
  }
}

export async function syncPartnerFulfillmentForOrder(sb: any, orderId: string, now = new Date()): Promise<void> {
  const loaded = await loadFulfillmentSnapshot(sb, orderId);
  if (!loaded) return;
  const snapshot = await attachPaymentLink(sb, loaded);
  await writeMergedJobs(sb, orderId, snapshot, now);
}

/** Best-effort outbox write. A missing migration or a sync error must not fail the order transaction that already committed. */
export async function schedulePartnerFulfillmentSync(sb: any, orderId: string): Promise<void> {
  try {
    if (!orderId) return;
    await syncPartnerFulfillmentForOrder(sb, orderId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (!/bearer|authorization|secret/i.test(message)) {
      console.error("[integration-outbound] schedule failed", { orderId, message: message.slice(0, 180) });
    }
  }
}
