import type { SupabaseClient } from "@supabase/supabase-js";

/** Fields needed to aggregate observation intelligence across cases. */
export const PROVIDER_OBSERVATION_CASE_INTEL_SELECT =
  "id, case_number, case_date, case_time, status, case_type, procedure_type, product_id, observation_goal, observation_quick_finding_product_interest, debrief_key_findings, live_observation_clinical_pain_points, live_observation_product_fit, live_observation_competitors, live_observation_workflow, live_observation_staff_process, live_observation_surgeon_reactions, observation_workflow_intelligence_snapshot, updated_at";

export async function loadProviderObservationCasesForIntelligence(
  supabase: SupabaseClient,
  input: {
    providerId: string;
    salesRepId: string;
    excludeCaseId?: string | null;
    limit?: number;
  },
): Promise<Array<Record<string, unknown>>> {
  let query = supabase
    .from("surgical_sales_cases")
    .select(PROVIDER_OBSERVATION_CASE_INTEL_SELECT)
    .eq("surgeon_contact_id", input.providerId)
    .eq("case_type", "observation")
    .order("case_date", { ascending: false, nullsFirst: false })
    .limit(input.limit ?? 24);

  const excludeCaseId = String(input.excludeCaseId ?? "").trim();
  if (excludeCaseId) {
    query = query.neq("id", excludeCaseId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[loadProviderObservationCasesForIntelligence]", error.message);
    return [];
  }
  return (data ?? []) as Array<Record<string, unknown>>;
}
