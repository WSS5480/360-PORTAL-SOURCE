/** Fields on `surgical_sales_cases` we snapshot for audit / timeline (no PHI-specific columns here). */
/** Pre-Call Plan fields live on engagements — @see preCallPlanFields.ts, preCallPlanActivityLog.ts */

export const SURGICAL_CASE_AUDIT_PATCH_KEYS = [
  "account_id",
  "surgeon_contact_id",
  "case_date",
  "case_time",
  "procedure_type",
  "product_id",
  "case_type",
  "observation_goal",
  "observation_key_questions",
  "observation_signals_to_validate",
  "live_observation_workflow",
  "live_observation_clinical_pain_points",
  "live_observation_surgeon_reactions",
  "live_observation_product_fit",
  "observation_quick_finding_product_interest",
  "live_observation_competitors",
  "live_observation_staff_process",
  "live_observation_questions",
  "live_observation_follow_up_items",
  "debrief_key_findings",
  "debrief_opportunity_score",
  "debrief_recommended_next_stage",
  "debrief_product_opportunity_identified",
  "follow_up_needed",
  "debrief_suggested_next_action",
  "debrief_convert_to_product_support_case",
  "case_support_outcome",
  "case_support_provider_reaction",
  "case_support_case_result",
  "case_support_next_step",
  "related_opportunity_id",
  "notes",
] as const;

export type SurgicalCaseAuditPatchKey = (typeof SURGICAL_CASE_AUDIT_PATCH_KEYS)[number];

const AUDIT_KEY_SET = new Set<string>(SURGICAL_CASE_AUDIT_PATCH_KEYS);

function stableJson(v: unknown): string {
  return JSON.stringify(v);
}

/**
 * For keys the client actually sent (excluding status / revenue if handled elsewhere),
 * return previous vs new snapshots only for audited case columns that changed.
 */
export function buildSurgicalCasePatchAuditDiff(params: {
  prevRow: Record<string, unknown>;
  nextRow: Record<string, unknown>;
  touchedKeys: readonly string[];
}): { previous_values: Record<string, unknown>; new_values: Record<string, unknown> } | null {
  const { prevRow, nextRow, touchedKeys } = params;
  const previous_values: Record<string, unknown> = {};
  const new_values: Record<string, unknown> = {};
  for (const k of touchedKeys) {
    if (!AUDIT_KEY_SET.has(k)) continue;
    const pv = prevRow[k] ?? null;
    const nv = nextRow[k] ?? null;
    if (stableJson(pv) !== stableJson(nv)) {
      previous_values[k] = pv;
      new_values[k] = nv;
    }
  }
  if (Object.keys(previous_values).length === 0) return null;
  return { previous_values, new_values };
}
