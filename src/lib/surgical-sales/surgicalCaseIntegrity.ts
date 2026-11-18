import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { loadDocumentTypesForCase } from "@/lib/surgical-sales/caseDocumentWorkflow";
import { surgicalCaseRequiresBillingWorkflow } from "@/lib/surgical-sales/billingReadiness";
import { resolvedActualQuantityForCompletedLine } from "@/lib/surgical-sales/casePerformedStatus";

/** Statuses that require a case-level product before entering (excludes scheduled + cancelled). */
export const SURGICAL_STATUSES_PAST_SCHEDULED = new Set([
  "confirmed",
  "completed",
  "docs_needed",
  "billing_review",
  "invoiced",
  "closed",
]);

export type DuplicateCaseSummary = { id: string; case_number: string; status: string };

/** Same account + same case date + same surgeon (both null surgeons count as match). Excludes cancelled. */
export async function findPotentialDuplicateCases(params: {
  accountId: string;
  caseDate: string;
  surgeonContactId: string | null;
  excludeCaseId?: string;
}): Promise<DuplicateCaseSummary[]> {
  let q = supabaseAdmin
    .from("surgical_sales_cases")
    .select("id, case_number, status")
    .eq("account_id", params.accountId)
    .eq("case_date", params.caseDate)
    .neq("status", "cancelled");
  if (params.excludeCaseId) {
    q = q.neq("id", params.excludeCaseId);
  }
  if (params.surgeonContactId) {
    q = q.eq("surgeon_contact_id", params.surgeonContactId);
  } else {
    q = q.is("surgeon_contact_id", null);
  }
  const { data, error } = await q.limit(12);
  if (error) throw new Error(error.message);
  return (data || []).map((r) => ({
    id: String((r as { id: string }).id),
    case_number: formatSurgicalCaseNumber(String((r as { case_number: string }).case_number)),
    status: String((r as { status: string }).status),
  }));
}

type LineQty = { actual_quantity: number | null };

/** Copy expected quantity onto blank actuals so a performed case can be marked completed. */
export async function applyExpectedQuantitiesAsActualWhenCompleting(
  caseId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: lines, error } = await supabaseAdmin
    .from("surgical_sales_case_products")
    .select("id, expected_quantity, actual_quantity")
    .eq("case_id", caseId);
  if (error) return { ok: false, error: error.message };

  const now = new Date().toISOString();
  for (const row of lines || []) {
    const line = row as { id: string; expected_quantity: number | null; actual_quantity: number | null };
    const nextActual = resolvedActualQuantityForCompletedLine(line.expected_quantity, line.actual_quantity);
    if (nextActual == null || nextActual === line.actual_quantity) continue;
    const { error: upErr } = await supabaseAdmin
      .from("surgical_sales_case_products")
      .update({ actual_quantity: nextActual, updated_at: now })
      .eq("id", line.id);
    if (upErr) return { ok: false, error: upErr.message };
  }
  return { ok: true };
}

export async function validateSurgicalCaseStatusPatch(params: {
  caseId: string;
  fromStatus: string;
  toStatus: string;
  /** Case primary product id after this patch (null = none). */
  effectiveProductId: string | null;
  caseType?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = params.fromStatus.toLowerCase();
  const to = params.toStatus.toLowerCase();
  if (to === from) return { ok: true };

  const { data: lines, error: linesErr } = await supabaseAdmin
    .from("surgical_sales_case_products")
    .select("actual_quantity")
    .eq("case_id", params.caseId);
  if (linesErr) return { ok: false, error: linesErr.message };
  const rows = (lines || []) as LineQty[];
  const requiresBilling = surgicalCaseRequiresBillingWorkflow({
    caseType: params.caseType,
    productId: params.effectiveProductId,
    productLineCount: rows.length,
  });

  if (to !== "cancelled" && SURGICAL_STATUSES_PAST_SCHEDULED.has(to) && !params.effectiveProductId && requiresBilling) {
    return {
      ok: false,
      error: "Choose a case product before moving past Scheduled.",
    };
  }

  if (to === "completed" && requiresBilling) {
    if (rows.length === 0) {
      return {
        ok: false,
        error: "Add at least one product line and enter actual quantities before marking the case completed.",
      };
    }
    for (const row of rows) {
      if (row.actual_quantity === null || row.actual_quantity === undefined) {
        return {
          ok: false,
          error: "Every product line needs an actual quantity before the case can be marked completed.",
        };
      }
      if (!Number.isFinite(Number(row.actual_quantity)) || Number(row.actual_quantity) < 0) {
        return { ok: false, error: "Actual quantities must be valid numbers (zero or greater)." };
      }
    }
  }

  if ((to === "invoiced" || to === "closed") && requiresBilling) {
    const types = await loadDocumentTypesForCase(params.caseId);
    if (!types.has("invoice")) {
      return {
        ok: false,
        error:
          to === "closed"
            ? "Upload an invoice before closing the case."
            : "Upload an invoice before marking the case invoiced.",
      };
    }
  }

  return { ok: true };
}

/** Non-blocking hints after a successful save (shown in UI). */
export function buildSurgicalCaseDataWarnings(input: {
  status: string;
  hasPurchaseOrder: boolean;
  expectedRevenue: number | null | undefined;
  surgeonContactId: string | null | undefined;
  requiresBilling?: boolean;
}): string[] {
  const warnings: string[] = [];
  const st = String(input.status || "").toLowerCase();
  const requiresBilling = input.requiresBilling ?? true;
  if (requiresBilling && (st === "completed" || st === "billing_review" || st === "invoiced" || st === "closed")) {
    if (!input.hasPurchaseOrder) {
      warnings.push("Purchase order is not on file yet — upload it when available.");
    }
  }
  const er = Number(input.expectedRevenue ?? 0);
  if (requiresBilling && (!Number.isFinite(er) || er <= 0)) {
    warnings.push("Expected revenue is blank or zero — consider entering an amount for forecasting.");
  }
  if (!input.surgeonContactId) {
    warnings.push("No surgeon contact is linked for this organization — add one when the roster is confirmed.");
  }
  return warnings;
}
