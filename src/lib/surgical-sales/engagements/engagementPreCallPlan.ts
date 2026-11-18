import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncEngagementPlanningPatch } from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import {
  buildPreCallPlanPatch,
  PRE_CALL_PLAN_CASE_KEYS,
  type PreCallPlanFieldKey,
} from "@/lib/surgical-sales/preCallPlanFields";
import { loadEngagementByCaseId } from "@/lib/surgical-sales/engagements/engagementAccess";

/** Pre-call plan columns stored on surgical_sales_engagements. */
export const ENGAGEMENT_PRE_CALL_PLAN_DB_KEYS = [...PRE_CALL_PLAN_CASE_KEYS] as const;

export function pickPreCallPlanPatchFromPayload(
  payload: Record<string, unknown>,
): Record<string, string | null> | null {
  const draft: Record<string, string> = {};
  let touched = false;
  for (const key of PRE_CALL_PLAN_CASE_KEYS) {
    if (payload[key] === undefined) continue;
    touched = true;
    draft[key] = payload[key] == null ? "" : String(payload[key]);
  }
  if (!touched) return null;
  const patch = buildPreCallPlanPatch(draft);
  const hasContent = Object.values(patch).some((value) => String(value ?? "").trim().length > 0);
  if (!hasContent) return null;
  return patch;
}

/** Merge engagement pre-call fields into a case-shaped row for legacy UI readers. */
export function mergeEngagementPreCallIntoCaseRow(
  caseRow: Record<string, unknown>,
  engagementRow: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!engagementRow) return caseRow;
  const merged: Record<string, unknown> = { ...caseRow, engagement_id: engagementRow.id ?? caseRow.engagement_id };
  for (const key of PRE_CALL_PLAN_CASE_KEYS) {
    if (engagementRow[key] !== undefined && engagementRow[key] !== null) {
      merged[key] = engagementRow[key];
    }
  }
  return merged;
}

/**
 * Resolve pre-call plan source row for a case: engagement when linked, else legacy case columns.
 */
export async function resolvePreCallPlanRowForCase(
  caseRow: Record<string, unknown>,
): Promise<{ row: Record<string, unknown>; engagementId: string | null; source: "engagement" | "case" }> {
  const engagement =
    (await loadEngagementByCaseId(String(caseRow.id ?? ""))) ??
    (caseRow.engagement_id
      ? (
          await supabaseAdmin
            .from("surgical_sales_engagements")
            .select("*")
            .eq("id", String(caseRow.engagement_id))
            .maybeSingle()
        ).data
      : null);

  if (engagement) {
    return {
      row: mergeEngagementPreCallIntoCaseRow(caseRow, engagement as Record<string, unknown>),
      engagementId: String((engagement as { id: string }).id),
      source: "engagement",
    };
  }
  return { row: caseRow, engagementId: null, source: "case" };
}

/** Write pre-call patch to engagement; optionally mirror to case during transition. */
export async function applyPreCallPlanToEngagement(params: {
  engagementId: string;
  patch: Record<string, string | null>;
  mirrorCaseId?: string | null;
}): Promise<{ ok: true; engagement: Record<string, unknown> } | { ok: false; message: string }> {
  const engagementPatch: Record<string, unknown> = {
    ...params.patch,
    pre_call_plan_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...syncEngagementPlanningPatch(
      {
        ...params.patch,
        pre_call_plan_updated_at: new Date().toISOString(),
      },
      params.engagementId,
    ),
  };

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update(engagementPatch)
    .eq("id", params.engagementId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message || "Failed to update engagement pre-call plan" };
  }

  if (params.mirrorCaseId) {
    await supabaseAdmin
      .from("surgical_sales_cases")
      .update({ ...params.patch, updated_at: new Date().toISOString() })
      .eq("id", params.mirrorCaseId);
  }

  return { ok: true, engagement: data as Record<string, unknown> };
}

export function engagementRowFromPreCallPatch(patch: Record<string, string | null>): Record<string, unknown> {
  return { ...patch };
}

export function preCallPlanTouchedKeys(payload: Record<string, unknown>): PreCallPlanFieldKey[] {
  return PRE_CALL_PLAN_CASE_KEYS.filter((k) => payload[k] !== undefined);
}
