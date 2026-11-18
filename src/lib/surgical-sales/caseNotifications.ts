import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/sendEmail";
import { surgicalCaseRequiresBillingWorkflow } from "@/lib/surgical-sales/billingReadiness";
import { loadDocumentTypesForCase } from "@/lib/surgical-sales/caseDocumentWorkflow";

export const SURGICAL_NOTIFICATION_TYPES = {
  CASE_ASSIGNED: "case_assigned",
  CASE_UPCOMING_24H: "case_upcoming_24h",
  CASE_MISSING_DOCS_COMPLETED: "case_missing_docs_completed",
  CASE_STUCK_WORKFLOW: "case_stuck_workflow",
} as const;

export type SurgicalNotificationType = (typeof SURGICAL_NOTIFICATION_TYPES)[keyof typeof SURGICAL_NOTIFICATION_TYPES];

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  );
}

function casePortalPath(caseId: string): string {
  return `${appBaseUrl().replace(/\/$/, "")}/portal/sales/cases/${caseId}`;
}

async function maybeEmailRep(params: { userId: string; subject: string; html: string }): Promise<boolean> {
  if (process.env.SURGICAL_CASE_NOTIFICATIONS_EMAIL !== "true") return false;
  const { data: row } = await supabaseAdmin.from("user_profiles").select("email").eq("user_id", params.userId).maybeSingle();
  const to = String((row as { email?: string | null } | null)?.email ?? "").trim();
  if (!to) return false;
  try {
    await sendEmail({
      to,
      subject: params.subject,
      html: params.html,
      text: params.subject,
      emailType: "default",
    });
    return true;
  } catch (e) {
    console.error("[surgical notifications] email failed", e);
    return false;
  }
}

export async function createSurgicalRepNotification(params: {
  userId: string;
  caseId: string;
  type: SurgicalNotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string | null;
  sendEmail?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; skipped: true } | { ok: false; error: string }> {
  if (params.dedupeKey) {
    const { data: existing } = await supabaseAdmin
      .from("surgical_sales_rep_notifications")
      .select("id")
      .eq("dedupe_key", params.dedupeKey)
      .maybeSingle();
    if (existing) return { ok: false, skipped: true };
  }

  const now = new Date().toISOString();
  const { data: inserted, error } = await supabaseAdmin
    .from("surgical_sales_rep_notifications")
    .insert({
      user_id: params.userId,
      case_id: params.caseId,
      notification_type: params.type,
      title: params.title,
      body: params.body,
      metadata_json: params.metadata ?? {},
      dedupe_key: params.dedupeKey ?? null,
      read_at: null,
      email_sent_at: null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, skipped: true };
    return { ok: false, error: error.message };
  }

  const id = String((inserted as { id: string }).id);

  if (params.sendEmail !== false) {
    const link = casePortalPath(params.caseId);
    const html = `<p>${params.body.replace(/\n/g, "<br/>")}</p><p><a href="${link}">Open case in portal</a></p>`;
    const sent = await maybeEmailRep({ userId: params.userId, subject: params.title, html });
    if (sent) {
      await supabaseAdmin.from("surgical_sales_rep_notifications").update({ email_sent_at: now }).eq("id", id);
    }
  }

  return { ok: true, id };
}

/** Admin created a case for another rep — notify assignee only. */
export async function notifySurgicalCaseAssignedToRep(params: {
  assigneeUserId: string;
  caseId: string;
  caseNumber: string;
  actorUserId: string;
}): Promise<void> {
  if (params.assigneeUserId === params.actorUserId) return;
  await createSurgicalRepNotification({
    userId: params.assigneeUserId,
    caseId: params.caseId,
    type: SURGICAL_NOTIFICATION_TYPES.CASE_ASSIGNED,
    title: `Case assigned: ${params.caseNumber}`,
    body: `You are now the owner of surgical case ${params.caseNumber}. Review details and next steps in the portal.`,
    metadata: { case_number: params.caseNumber },
    dedupeKey: `assigned:${params.caseId}:${params.assigneeUserId}`,
  });
}

export async function notifySurgicalCaseMissingDocsAfterCompleted(params: {
  repUserId: string;
  caseId: string;
  caseNumber: string;
  missingLabels: string[];
}): Promise<void> {
  if (params.missingLabels.length === 0) return;
  const body = `Case ${params.caseNumber} is completed but still needs: ${params.missingLabels.join(", ")}.`;
  await createSurgicalRepNotification({
    userId: params.repUserId,
    caseId: params.caseId,
    type: SURGICAL_NOTIFICATION_TYPES.CASE_MISSING_DOCS_COMPLETED,
    title: `Missing documents — ${params.caseNumber}`,
    body,
    metadata: { case_number: params.caseNumber, missing: params.missingLabels },
    dedupeKey: `missing_docs_completed:${params.caseId}`,
  });
}

export async function listMissingBillingDocLabels(caseId: string): Promise<string[]> {
  const [{ data: caseRow }, { count: productLineCount }] = await Promise.all([
    supabaseAdmin.from("surgical_sales_cases").select("case_type, product_id").eq("id", caseId).maybeSingle(),
    supabaseAdmin.from("surgical_sales_case_products").select("id", { count: "exact", head: true }).eq("case_id", caseId),
  ]);
  if (
    !surgicalCaseRequiresBillingWorkflow({
      caseType: (caseRow as { case_type?: string | null } | null)?.case_type,
      productId: (caseRow as { product_id?: string | null } | null)?.product_id,
      productLineCount: productLineCount ?? 0,
    })
  ) {
    return [];
  }
  const types = await loadDocumentTypesForCase(caseId);
  const missing: string[] = [];
  if (!types.has("purchase_order")) missing.push("Purchase order");
  if (!types.has("invoice")) missing.push("Invoice");
  return missing;
}

/** Calendar day before case_date (UTC): remind assigned rep. */
export async function runSurgicalCaseUpcomingNotifications(): Promise<number> {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const ymd = tomorrow.toISOString().slice(0, 10);

  const { data: rows, error } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("id, case_number, case_date, sales_rep_id, status")
    .eq("case_date", ymd)
    .neq("status", "cancelled");

  if (error) {
    console.error("[surgical notifications] upcoming query", error.message);
    return 0;
  }

  let n = 0;
  for (const r of rows || []) {
    const caseId = String((r as { id: string }).id);
    const repId = String((r as { sales_rep_id: string }).sales_rep_id);
    const num = String((r as { case_number: string }).case_number);
    const res = await createSurgicalRepNotification({
      userId: repId,
      caseId,
      type: SURGICAL_NOTIFICATION_TYPES.CASE_UPCOMING_24H,
      title: `Upcoming case tomorrow — ${num}`,
      body: `Case ${num} is scheduled for ${ymd}. Confirm materials, documents, and contacts.`,
      metadata: { case_number: num, case_date: ymd },
      dedupeKey: `upcoming:${caseId}:${ymd}`,
    });
    if (res.ok) n += 1;
    else if ("error" in res && res.error) console.error("[surgical notifications] upcoming insert", res.error);
  }
  return n;
}

/** Cases stuck in docs_needed or billing_review (no updates in 72h). */
export async function runSurgicalCaseStuckWorkflowNotifications(): Promise<number> {
  const cutoff = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const bucket = Math.floor(Date.now() / (5 * 86400000));

  const { data: rows, error } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("id, case_number, status, sales_rep_id, updated_at")
    .in("status", ["docs_needed", "billing_review"])
    .lt("updated_at", cutoff);

  if (error) {
    console.error("[surgical notifications] stuck query", error.message);
    return 0;
  }

  let n = 0;
  for (const r of rows || []) {
    const caseId = String((r as { id: string }).id);
    const repId = String((r as { sales_rep_id: string }).sales_rep_id);
    const num = String((r as { case_number: string }).case_number);
    const st = String((r as { status: string }).status);
    const res = await createSurgicalRepNotification({
      userId: repId,
      caseId,
      type: SURGICAL_NOTIFICATION_TYPES.CASE_STUCK_WORKFLOW,
      title: `Case needs attention — ${num}`,
      body: `Case ${num} has been in "${st.replace(/_/g, " ")}" with no updates for 72+ hours. Unblock or update status.`,
      metadata: { case_number: num, status: st },
      dedupeKey: `stuck:${caseId}:${st}:${bucket}`,
    });
    if (res.ok) n += 1;
    else if ("error" in res && res.error) console.error("[surgical notifications] stuck insert", res.error);
  }
  return n;
}
