/**
 * Pre-Call Plan compatibility layer.
 *
 * User-facing terminology: Pre-Call Plan.
 * Database columns remain `pre_observation_*` / `provider_pre_observation_*` until a safe migration.
 */

export {
  PRE_CALL_PLAN_LABEL,
  PRE_CALL_PLAN_DESCRIPTION,
  PRE_CALL_PLAN_STAGE_LABEL,
  PRE_CALL_PLAN_FIELD_CONFIGS,
  PRE_CALL_PLAN_CASE_KEYS,
  PRE_CALL_PLAN_MOBILE_PLANNING_FIELDS,
  OPEN_PROVIDER_INTELLIGENCE_LABEL,
  OPEN_PROVIDER_PROFILE_LABEL,
  providerIntelligenceHref,
  buildPreCallPlanDraft,
  buildPreCallPlanPatch,
  hasPreCallPlanData,
  countPreCallPlanFilled,
  countCaseSetupReadiness,
  preCallPlanDisplayValue,
  type PreCallPlanFieldKey,
  type PreCallPlanFieldConfig,
  type PreCallPlanContext,
} from "@/lib/surgical-sales/preCallPlanFields";

import {
  PRE_CALL_PLAN_FIELD_CONFIGS,
  hasPreCallPlanData,
  type PreCallPlanFieldKey,
} from "@/lib/surgical-sales/preCallPlanFields";

/** Canonical workflow stage id (stored in metadata / UI). */
export const PRE_CALL_PLAN_WORKFLOW_STAGE_ID = "pre_call_plan" as const;

/**
 * Legacy workflow stage aliases → `pre_call_plan`.
 * Includes historical `pre_observation_planning` and camelCase `preObservationPlanning`.
 */
export const PRE_CALL_PLAN_WORKFLOW_STAGE_ALIASES: Record<string, typeof PRE_CALL_PLAN_WORKFLOW_STAGE_ID> = {
  planning: "pre_call_plan",
  pre_observation: "pre_call_plan",
  pre_observation_planning: "pre_call_plan",
  preObservationPlanning: "pre_call_plan",
};

/**
 * Engagement/case column names for Pre-Call Plan (legacy `pre_observation_*` on case during transition).
 * Authoritative storage: surgical_sales_engagements. Excludes contextual hospital/surgeon keys in this list.
 */
export const PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS = [
  "pre_observation_impact_opening_statement",
  "pre_observation_probes",
  "pre_observation_tools_resources",
  "pre_observation_value_hypothesis",
  "pre_observation_planned_close",
  "pre_observation_additional_notes",
] as const;

export type PreCallPlanCaseDbColumnKey = (typeof PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS)[number];

export type PreCallPlanFormFieldConfig = {
  caseKey: Exclude<PreCallPlanFieldKey, "pre_call_hospital_name" | "pre_call_surgeon_name">;
  providerKey: string;
  label: string;
  rows: number;
};

/** Pre-Call Plan form fields (excludes contextual hospital / surgeon rows). */
export const PRE_CALL_PLAN_FORM_FIELD_CONFIGS: PreCallPlanFormFieldConfig[] = PRE_CALL_PLAN_FIELD_CONFIGS.filter(
  (f) => f.key !== "pre_call_hospital_name" && f.key !== "pre_call_surgeon_name",
).map((f) => ({
  caseKey: f.key as PreCallPlanFormFieldConfig["caseKey"],
  providerKey: `provider_${f.key}`,
  label: f.label,
  rows: f.rows,
}));

export type PreCallPlanCaseFieldLine = {
  caseKey: string;
  label: string;
  value: string;
};

export function buildPreCallPlanLinesFromCase(caseRow: Record<string, unknown>): PreCallPlanCaseFieldLine[] {
  const lines: PreCallPlanCaseFieldLine[] = [];
  for (const field of PRE_CALL_PLAN_FORM_FIELD_CONFIGS) {
    const value = String(caseRow[field.caseKey] ?? "").trim();
    if (!value) continue;
    lines.push({ caseKey: field.caseKey, label: field.label, value });
  }
  return lines;
}

/** @deprecated Historical provider column mapping — DB names unchanged. */
export const CASE_LEGACY_TO_PROVIDER_PRE_CALL_PLAN_KEY: Record<
  PreCallPlanFormFieldConfig["caseKey"],
  string
> = {
  pre_observation_impact_opening_statement: "provider_pre_observation_impact_opening_statement",
  pre_observation_probes: "provider_pre_observation_probes",
  pre_observation_tools_resources: "provider_pre_observation_tools_resources",
  pre_observation_value_hypothesis: "provider_pre_observation_value_hypothesis",
  pre_observation_planned_close: "provider_pre_observation_planned_close",
  pre_observation_additional_notes: "provider_pre_observation_additional_notes",
  observation_goal: "provider_strategic_goal",
};

// —— Deprecated Pre-Observation Planning names (compatibility only) ——

/** @deprecated Use PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS */
export const LEGACY_CASE_PRE_OBSERVATION_KEYS = PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS;

/** @deprecated Use PRE_CALL_PLAN_FORM_FIELD_CONFIGS */
export const LEGACY_CASE_PRE_OBSERVATION_FIELD_CONFIGS = PRE_CALL_PLAN_FORM_FIELD_CONFIGS;

/** @deprecated Use PreCallPlanFormFieldConfig */
export type LegacyCasePreObservationFieldConfig = PreCallPlanFormFieldConfig;

/** @deprecated Use PreCallPlanCaseFieldLine */
export type LegacyCasePlanningLine = PreCallPlanCaseFieldLine;

/** @deprecated Use buildPreCallPlanLinesFromCase */
export const buildLegacyCasePreObservationLines = buildPreCallPlanLinesFromCase;

/** @deprecated Use hasPreCallPlanData */
export const hasLegacyCasePreObservationData = hasPreCallPlanData;

/** @deprecated Use CASE_LEGACY_TO_PROVIDER_PRE_CALL_PLAN_KEY */
export const CASE_LEGACY_TO_PROVIDER_PRE_OBSERVATION_KEY = CASE_LEGACY_TO_PROVIDER_PRE_CALL_PLAN_KEY;

/** @deprecated Use providerIntelligenceHref from preCallPlanFields */
export { providerIntelligenceHref as providerPreObservationPlanningHref } from "@/lib/surgical-sales/preCallPlanFields";

/** @deprecated Provider wizard planning defs — not Pre-Call Plan */
export const PROVIDER_PRE_OBSERVATION_PLANNING_FIELD_DEFS: never[] = [];
