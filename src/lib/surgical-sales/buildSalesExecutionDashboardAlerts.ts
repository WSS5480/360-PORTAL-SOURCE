/**
 * Dashboard field alerts — only real sales/execution next steps and blockers.
 * Optional admin/intelligence metadata never surfaces here.
 */

import type { SurgicalCaseListRow } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import {
  assessCaseSalesExecutionNeedsAction,
  type SalesExecutionNeedsActionId,
} from "@/lib/surgical-sales/salesExecutionNeedsAction";

export type SalesExecutionDashboardAlertCounts = {
  cases_needing_action: number;
  observation_debrief_pending: number;
  observation_notes_missing: number;
  follow_up_unscheduled: number;
  product_support_review_pending: number;
  scheduled_readiness_blocked: number;
  scheduled_observation_objectives_missing: number;
};

function emptyCounts(): SalesExecutionDashboardAlertCounts {
  return {
    cases_needing_action: 0,
    observation_debrief_pending: 0,
    observation_notes_missing: 0,
    follow_up_unscheduled: 0,
    product_support_review_pending: 0,
    scheduled_readiness_blocked: 0,
    scheduled_observation_objectives_missing: 0,
  };
}

const COUNT_KEY_BY_ID: Partial<Record<SalesExecutionNeedsActionId, keyof SalesExecutionDashboardAlertCounts>> = {
  observation_debrief_pending: "observation_debrief_pending",
  observation_notes_missing: "observation_notes_missing",
  follow_up_unscheduled: "follow_up_unscheduled",
  product_support_review_pending: "product_support_review_pending",
  scheduled_case_readiness_blocked: "scheduled_readiness_blocked",
  provider_debrief_pending: "observation_debrief_pending",
  evaluation_follow_up_needed: "follow_up_unscheduled",
};

export function buildSalesExecutionDashboardAlertCounts(
  cases: SurgicalCaseListRow[],
  today = new Date().toISOString().slice(0, 10),
): SalesExecutionDashboardAlertCounts {
  const counts = emptyCounts();

  for (const caseRow of cases) {
    const assessment = assessCaseSalesExecutionNeedsAction(caseRow, today);
    if (!assessment.needsAction) continue;

    counts.cases_needing_action += 1;
    for (const item of assessment.items) {
      const key = COUNT_KEY_BY_ID[item.id];
      if (key) counts[key] += 1;
    }
  }

  return counts;
}
