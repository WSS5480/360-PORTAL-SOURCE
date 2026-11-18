import { supabaseAdmin } from "@/lib/supabase/admin";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { formatSurgicalCaseStatus } from "@/lib/surgical-sales/labels";

export async function loadDocumentTypesForCase(caseId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from("surgical_sales_case_documents").select("document_type").eq("case_id", caseId);
  const set = new Set<string>();
  for (const d of data || []) {
    set.add(String((d as { document_type: string }).document_type).toLowerCase());
  }
  return set;
}

async function setCaseStatusWithActivity(caseId: string, userId: string, fromStatus: string, toStatus: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("surgical_sales_cases").update({ status: toStatus, updated_at: now }).eq("id", caseId);
  if (error) return { ok: false, message: error.message };
  const log = await logSurgicalCaseActivity({
    caseId,
    userId,
    activityType: "status_change",
    body: `Status changed from ${formatSurgicalCaseStatus(fromStatus)} to ${formatSurgicalCaseStatus(toStatus)}.`,
    metadataJson: { from_status: fromStatus, to_status: toStatus, source: "document_workflow" },
    previousValues: { status: fromStatus },
    newValues: { status: toStatus },
  });
  if (!log.ok) return { ok: false, message: log.message };
  return { ok: true };
}

/**
 * After a successful document insert: advance status for billing workflow.
 * - docs_needed + PO + invoice → billing_review
 * - invoice uploaded (any prior status except invoiced/closed/cancelled) → invoiced
 */
export async function applySurgicalCaseDocumentWorkflow(params: {
  caseId: string;
  userId: string;
  documentType: string;
}): Promise<void> {
  const { caseId, userId, documentType } = params;

  const { data: caseRow, error: cErr } = await supabaseAdmin.from("surgical_sales_cases").select("status").eq("id", caseId).maybeSingle();
  if (cErr || !caseRow) return;

  let st = String((caseRow as { status: string }).status).toLowerCase();
  const types = await loadDocumentTypesForCase(caseId);
  const hasPo = types.has("purchase_order");
  const hasInv = types.has("invoice");

  if (hasPo && hasInv && st === "docs_needed") {
    const r = await setCaseStatusWithActivity(caseId, userId, st, "billing_review");
    if (r.ok) st = "billing_review";
  }

  if (documentType === "invoice" && !["invoiced", "closed", "cancelled"].includes(st)) {
    await setCaseStatusWithActivity(caseId, userId, st, "invoiced");
  }
}
