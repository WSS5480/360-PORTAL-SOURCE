import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { applyManualRetry } from "@/lib/integrations/outbound/jobQueue";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { jobId } = await params;
  if (!UUID_RE.test(jobId)) return NextResponse.json({ ok: false, error: "Synchronization job not found." }, { status: 404 });

  const sb = createSupabaseAdminClient();
  const { data, error } = await sb
    .from("integration_outbound_jobs")
    .select("id, status, attempt_count, max_attempts, next_attempt_at, blocked_reason, last_error, payload, payload_hash, partner_id, order_id, external_order_number, event_type, business_key, locked_at, locked_by, last_http_status, updated_at")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: "Synchronization job not found." }, { status: 404 });

  const retry = applyManualRetry(
    {
      id: data.id,
      partnerId: data.partner_id,
      orderId: data.order_id,
      externalOrderNumber: data.external_order_number,
      eventType: data.event_type,
      businessKey: data.business_key,
      payload: data.payload ?? {},
      payloadHash: data.payload_hash,
      status: data.status,
      blockedReason: data.blocked_reason,
      waitReason: null,
      attemptCount: data.attempt_count,
      maxAttempts: data.max_attempts,
      nextAttemptAt: data.next_attempt_at,
      lockedAt: data.locked_at,
      lockedBy: data.locked_by,
      lastHttpStatus: data.last_http_status,
      lastError: data.last_error,
      updatedAt: data.updated_at,
    },
    new Date()
  );
  if (!retry.ok) return NextResponse.json({ ok: false, error: retry.error }, { status: 409 });

  const { error: updateError } = await sb
    .from("integration_outbound_jobs")
    .update({
      status: "pending",
      attempt_count: 0,
      blocked_reason: null,
      last_error: null,
      next_attempt_at: retry.job.nextAttemptAt,
      locked_at: null,
      locked_by: null,
      updated_at: retry.job.updatedAt,
    })
    .eq("id", jobId)
    .in("status", ["failed", "blocked"]);
  if (updateError) return NextResponse.json({ ok: false, error: "The synchronization could not be retried." }, { status: 500 });

  return NextResponse.json({
    ok: true,
    job: {
      id: jobId,
      status: "pending",
      event_type: data.event_type,
      external_order_number: data.external_order_number,
    },
  });
}
