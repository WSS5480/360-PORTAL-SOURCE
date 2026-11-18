import { deriveSalesPathwayState } from "@/lib/surgical-sales/deriveSalesPathwayState";
import { SALES_PATHWAY_STAGE_LABELS, type SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import { adminFunnelStageFromPathway } from "@/lib/surgical-sales/admin/buildAdminPathwayFunnel";

/** Case columns required by pathway gates (observation completion, product support trials, etc.). */
export const ADMIN_PATHWAY_CASE_SELECT =
  "id, case_number, sales_rep_id, surgeon_contact_id, case_type, status, case_date, procedure_type, notes, observation_goal, debrief_key_findings, live_observation_workflow, live_observation_clinical_pain_points, live_observation_product_fit, live_observation_competitors, live_observation_staff_process, live_observation_surgeon_reactions, observation_workflow_intelligence_snapshot, case_support_outcome, case_support_case_result, product_id, expected_revenue, actual_revenue, created_at, updated_at, archived_at, observation_completed_at, engagement_id";

export const ADMIN_PATHWAY_ENGAGEMENT_SELECT =
  "id, sales_rep_id, provider_id, engagement_type, status, debrief_completed, debrief_completed_at, updated_at";

export type AdminPathwayEngagementRow = {
  id: string;
  sales_rep_id: string;
  provider_id: string | null;
  engagement_type: string;
  status: string;
  debrief_completed?: boolean | null;
  debrief_completed_at?: string | null;
  updated_at: string;
};

export type AdminPathwayCaseRow = Record<string, unknown> & {
  id: string;
  sales_rep_id: string;
  surgeon_contact_id: string | null;
  case_type: string | null;
  status: string | null;
  archived_at?: string | null;
};

export function deriveAdminProviderPathwayState(input: {
  providerId: string;
  contact: Record<string, unknown>;
  cases?: AdminPathwayCaseRow[];
  engagements?: AdminPathwayEngagementRow[];
}) {
  const activeCases = (input.cases ?? []).filter((row) => {
    const status = String(row.status ?? "").toLowerCase();
    return status !== "cancelled" && !row.archived_at;
  });

  return deriveSalesPathwayState({
    providerId: input.providerId,
    contact: input.contact,
    cases: activeCases,
    engagements: input.engagements ?? [],
  });
}

export function adminProviderPathwayLabels(pathway: ReturnType<typeof deriveSalesPathwayState>) {
  return {
    stage_id: pathway.currentStage as SalesPathwayStageId,
    stage_label: SALES_PATHWAY_STAGE_LABELS[pathway.currentStage],
    funnel_stage_id: adminFunnelStageFromPathway(pathway.currentStage),
  };
}
