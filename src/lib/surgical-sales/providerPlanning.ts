import {
  PROVIDER_PRE_PLANNING_FIELDS,
  type ProviderPlanningFieldKey,
} from "@/lib/surgical-sales/providerPrePlanningFieldConfig";
import { PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS } from "@/lib/surgical-sales/preCallPlanCompat";

import {

  buildProviderPlanningCompletion as buildProviderPlanningCompletionCore,

  type ProviderPlanningCompletion,

  type ProviderPlanningContext,

  type ProviderPlanningSectionCompletion,

  type ProviderPlanningSectionId,

  type ProviderPlanningSectionStatus,

} from "@/lib/surgical-sales/providerPlanningCompletion";

import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderOrgLinkForPlanning } from "@/lib/surgical-sales/providerPlanningCompletion";



export type ProviderPlanningStatus = "not_started" | "in_progress" | "complete" | "needs_update";



export const PROVIDER_PLANNING_LABEL: Record<ProviderPlanningStatus, string> = {

  not_started: "Not started",

  in_progress: "In progress",

  complete: "Complete",

  needs_update: "Needs update",

};



export type {

  ProviderPlanningCompletion,

  ProviderPlanningContext,

  ProviderPlanningSectionCompletion,

  ProviderPlanningSectionId,

  ProviderPlanningSectionStatus,

};



export {

  PROVIDER_PLANNING_SECTION_LABELS,

  PROVIDER_PLANNING_SECTION_STATUS_LABEL,

  PROVIDER_PLANNING_STALE_MS,

  buildProviderPlanningSections,

  clinicalDiscoverySectionFromPlanning,

  findPlanningSection,

  formatPlanningSectionProgress,

  CLINICAL_DISCOVERY_QUESTION_TOTAL,

} from "@/lib/surgical-sales/providerPlanningCompletion";



export function buildProviderPlanningCompletion(
  contact: Record<string, unknown>,
  context?: ProviderPlanningContext,
  orgLinks?: ProviderOrgLinkForPlanning[],
  _clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[],
): ProviderPlanningCompletion {
  void _clinicalDiscoveryAnswers;
  return buildProviderPlanningCompletionCore(contact, context, orgLinks);
}



/** @deprecated Use buildProviderPlanningCompletion — counts all required planning sections. */

export function countProviderPlanningFields(

  row: Record<string, unknown>,

): Omit<ProviderPlanningCompletion, "status" | "sections" | "sections_complete" | "sections_total"> {

  const completion = buildProviderPlanningCompletion(row);

  return {

    filled: completion.filled,

    total: completion.total,

    percent: completion.percent,

  };

}



export function isProviderPlanningIncomplete(status: ProviderPlanningStatus): boolean {

  return status === "not_started" || status === "in_progress";

}



export function providerPlanningNeedsAttention(status: ProviderPlanningStatus): boolean {

  return isProviderPlanningIncomplete(status) || status === "needs_update";

}



export type ProviderPlanningSnapshotLine = {

  label: string;

  value: string;

  fieldKey: ProviderPlanningFieldKey;

};



export function buildProviderPlanningSnapshotLines(

  contact: Record<string, unknown>,

  maxLines = 4,

): ProviderPlanningSnapshotLine[] {

  const lines: ProviderPlanningSnapshotLine[] = [];

  for (const field of PROVIDER_PRE_PLANNING_FIELDS) {

    const raw = String(contact[field.key] ?? "").trim();

    if (!raw) continue;

    const value = raw.length > 140 ? `${raw.slice(0, 137)}…` : raw;

    lines.push({ label: field.label, value, fieldKey: field.key });

    if (lines.length >= maxLines) break;

  }

  return lines;

}

export { PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS };

/** @deprecated Use PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS from `preCallPlanCompat.ts` */
export const LEGACY_CASE_PRE_OBSERVATION_KEYS = PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS;
