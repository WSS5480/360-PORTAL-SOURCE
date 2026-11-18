import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildCoachingGuidanceInputsComparison } from "@/lib/surgical-sales/universalExtractor/buildCoachingGuidanceInputsComparison";
import type { CoachingGuidanceInputsComparison } from "@/lib/surgical-sales/universalExtractor/coachingGuidanceInputsTypes";
import { loadUniversalFactsReadModelForCase } from "@/lib/surgical-sales/universalExtractor/loadUniversalFactsReadModel";

export async function loadCoachingGuidanceInputsComparisonForCase(
  caseId: string,
): Promise<CoachingGuidanceInputsComparison | null> {
  const { data: caseRow, error: caseErr } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();

  if (caseErr) throw new Error(caseErr.message);
  if (!caseRow) return null;

  const surgeonId = (caseRow as { surgeon_contact_id?: string | null }).surgeon_contact_id
    ? String((caseRow as { surgeon_contact_id?: string | null }).surgeon_contact_id)
    : null;

  const [{ data: activities }, providerContact, priorCases] = await Promise.all([
    supabaseAdmin
      .from("surgical_sales_case_activities")
      .select("id, activity_type, body, metadata_json, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true })
      .limit(300),
    surgeonId
      ? supabaseAdmin
          .from("surgical_sales_contacts")
          .select("id, first_name, last_name, role_type")
          .eq("id", surgeonId)
          .maybeSingle()
          .then((res) => (res.error ? null : res.data))
      : Promise.resolve(null),
    loadProviderPriorObservationCases({ caseId, providerId: surgeonId }),
  ]);

  const universalFactsReadModel = await loadUniversalFactsReadModelForCase({
    caseId,
    providerId: surgeonId,
  });

  return buildCoachingGuidanceInputsComparison({
    caseRow: caseRow as Record<string, unknown>,
    priorCases,
    activities: (activities ?? []) as Array<{ activity_type?: string; body?: string }>,
    providerContact: (providerContact as Record<string, unknown> | null) ?? null,
    universalFactsReadModel,
  });
}

async function loadProviderPriorObservationCases(input: {
  caseId: string;
  providerId: string | null;
}): Promise<Array<Record<string, unknown>>> {
  if (!input.providerId) return [];

  const { data: priorCases, error } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select(
      "id, procedure_type, case_date, status, observation_completed_at, live_observation_competitors, live_observation_product_fit, live_observation_workflow, live_observation_clinical_pain_points, live_observation_staff_process, live_observation_surgeon_reactions, notes, observation_workflow_intelligence_snapshot",
    )
    .eq("surgeon_contact_id", input.providerId)
    .eq("case_type", "observation")
    .neq("id", input.caseId)
    .order("case_date", { ascending: false })
    .limit(12);

  if (error) throw new Error(error.message);

  const rows = (priorCases ?? []) as Record<string, unknown>[];
  const priorCaseIds = rows.map((row) => String(row.id ?? "").trim()).filter(Boolean);
  if (priorCaseIds.length === 0) return rows;

  const { data: priorActivities } = await supabaseAdmin
    .from("surgical_sales_case_activities")
    .select("id, case_id, activity_type, body, metadata_json, created_at")
    .in("case_id", priorCaseIds)
    .order("created_at", { ascending: true })
    .limit(600);

  const activitiesByCase = new Map<string, Record<string, unknown>[]>();
  for (const activity of priorActivities ?? []) {
    const activityCaseId = String((activity as { case_id?: string }).case_id ?? "").trim();
    if (!activityCaseId) continue;
    const bucket = activitiesByCase.get(activityCaseId) ?? [];
    bucket.push(activity as Record<string, unknown>);
    activitiesByCase.set(activityCaseId, bucket);
  }

  return rows.map((priorCase) => {
    const priorCaseId = String(priorCase.id ?? "").trim();
    const caseActivities = activitiesByCase.get(priorCaseId);
    return caseActivities?.length ? { ...priorCase, activities: caseActivities } : priorCase;
  });
}
