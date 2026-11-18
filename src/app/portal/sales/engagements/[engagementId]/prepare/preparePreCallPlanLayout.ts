import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import { STRATEGIC_PLAN_FIELD_KEYS } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import { PRE_CALL_PLAN_STRATEGIC_DRAFT_KEYS } from "@/lib/surgical-sales/preCallPlanStrategicTemplateMapping";

/** Planned prepare page — left column (desktop). */
export const PRE_CALL_PLAN_LEFT_COLUMN_KEYS: readonly PreCallPlanFieldKey[] = [
  "observation_goal",
  "pre_observation_impact_opening_statement",
  "pre_observation_value_hypothesis",
  "pre_observation_planned_close",
];

/** Planned prepare page — right column (desktop). */
export const PRE_CALL_PLAN_RIGHT_COLUMN_KEYS: readonly PreCallPlanFieldKey[] = [
  "pre_observation_probes",
  "pre_observation_tools_resources",
  "pre_observation_additional_notes",
];

export const PRE_CALL_PLAN_MOBILE_FIELD_ORDER: readonly PreCallPlanFieldKey[] = [
  ...PRE_CALL_PLAN_LEFT_COLUMN_KEYS,
  ...PRE_CALL_PLAN_RIGHT_COLUMN_KEYS,
];

export function isPreCallPlanStrategicFieldKey(key: string): key is PreCallPlanFieldKey {
  return (STRATEGIC_PLAN_FIELD_KEYS as readonly string[]).includes(key);
}

export function pickPreCallPlanFieldConfigs(
  allFields: EngagementWorkflowFieldConfig[],
): {
  left: EngagementWorkflowFieldConfig[];
  right: EngagementWorkflowFieldConfig[];
  mobileOrder: EngagementWorkflowFieldConfig[];
} {
  const byKey = new Map(allFields.map((f) => [f.key, f]));
  const left = PRE_CALL_PLAN_LEFT_COLUMN_KEYS.map((k) => byKey.get(k)).filter(
    (f): f is EngagementWorkflowFieldConfig => Boolean(f),
  );
  const right = PRE_CALL_PLAN_RIGHT_COLUMN_KEYS.map((k) => byKey.get(k)).filter(
    (f): f is EngagementWorkflowFieldConfig => Boolean(f),
  );
  const mobileOrder = PRE_CALL_PLAN_MOBILE_FIELD_ORDER.map((k) => byKey.get(k)).filter(
    (f): f is EngagementWorkflowFieldConfig => Boolean(f),
  );
  return { left, right, mobileOrder };
}
