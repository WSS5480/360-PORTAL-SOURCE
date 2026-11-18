import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import { PRE_CALL_PLAN_STRATEGIC_DRAFT_KEYS } from "@/lib/surgical-sales/preCallPlanStrategicTemplateMapping";
import {
  resolveEngagementWorkflowMode,
  workflowFieldConfigsForMode,
  type EngagementWorkflowFieldConfig,
  type EngagementWorkflowFieldKey,
  type EngagementWorkflowModeOverride,
} from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
export type EngagementWorkflowDraft = Record<string, string>;

export const ENGAGEMENT_WORKFLOW_STORAGE_KEYS = [
  "engagement_purpose",
  "next_action",
  "follow_up_tasks",
  "sim_lab_focus",
  "products_to_demonstrate",
  "attendees",
  "hands_on_goals",
  "adoption_signals_to_watch",
  "engagement_workflow_mode",
] as const;

export function emptyEngagementWorkflowDraft(
  mode: "strategic" | "lightweight",
  engagementType: string,
): EngagementWorkflowDraft {
  const draft: EngagementWorkflowDraft = {};
  for (const field of workflowFieldConfigsForMode(mode, engagementType)) {
    draft[field.key] = "";
  }
  return draft;
}

export function buildEngagementWorkflowDraftFromRow(
  row: Record<string, unknown>,
  engagementType: string,
  workflowModeOverride?: EngagementWorkflowModeOverride | null,
): EngagementWorkflowDraft {
  const mode = resolveEngagementWorkflowMode(engagementType, workflowModeOverride);
  const draft: EngagementWorkflowDraft = {};
  for (const field of workflowFieldConfigsForMode(mode, engagementType)) {
    draft[field.key] = String(row[field.storageKey] ?? "").trim();
  }
  return draft;
}

export function countWorkflowFieldsFilled(
  draft: EngagementWorkflowDraft,
  mode: "strategic" | "lightweight",
  engagementType: string,
): { filled: number; total: number } {
  const configs = workflowFieldConfigsForMode(mode, engagementType);
  const total = configs.length;
  const filled = configs.filter((f) => String(draft[f.key] ?? "").trim().length > 0).length;
  return { filled, total };
}

export function hasWorkflowPlanData(
  draft: EngagementWorkflowDraft,
  mode: "strategic" | "lightweight",
  engagementType: string,
): boolean {
  return countWorkflowFieldsFilled(draft, mode, engagementType).filled > 0;
}

export function buildEngagementWorkflowPatch(
  draft: EngagementWorkflowDraft,
  mode: "strategic" | "lightweight",
  engagementType: string,
): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  for (const field of workflowFieldConfigsForMode(mode, engagementType)) {
    const raw = draft[field.key];
    if (raw === undefined) continue;
    patch[field.storageKey] = String(raw).trim() || null;
  }
  return patch;
}

export function strategicPreCallKeysFromDraft(draft: EngagementWorkflowDraft): Record<PreCallPlanFieldKey, string> {
  const out = {} as Record<PreCallPlanFieldKey, string>;
  const keys: PreCallPlanFieldKey[] = [
    "pre_call_hospital_name",
    "pre_call_surgeon_name",
    "observation_goal",
    "pre_observation_impact_opening_statement",
    "pre_observation_probes",
    "pre_observation_tools_resources",
    "pre_observation_value_hypothesis",
    "pre_observation_planned_close",
    "pre_observation_additional_notes",
  ];
  for (const key of keys) {
    out[key] = String(draft[key] ?? "");
  }
  return out;
}

export function mergeTemplateIntoWorkflowDraft(
  draft: EngagementWorkflowDraft,
  templateFields: Record<PreCallPlanFieldKey, string>,
): EngagementWorkflowDraft {
  const next = { ...draft };
  for (const key of PRE_CALL_PLAN_STRATEGIC_DRAFT_KEYS) {
    const value = templateFields[key];
    if (value?.trim()) next[key] = value;
  }
  return next;
}

function fillOfficeVisit360Field(
  next: EngagementWorkflowDraft,
  key: keyof EngagementWorkflowDraft,
  value: string | undefined,
  mode: "fill_empty" | "overwrite" = "fill_empty",
): void {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return;
  const current = String(next[key] ?? "").trim();
  if (mode === "fill_empty" && current) return;
  next[key] = trimmed;
}

/** Map playbook template fields into the two 360 Experience prepare questions. */
export function mergeTemplateIntoOfficeVisitDraft(
  draft: EngagementWorkflowDraft,
  templateFields: Record<PreCallPlanFieldKey, string>,
): EngagementWorkflowDraft {
  const next = { ...draft };

  fillOfficeVisit360Field(next, "observation_goal", templateFields.observation_goal);
  fillOfficeVisit360Field(next, "sim_lab_focus", templateFields.pre_observation_probes);

  return next;
}

/** Minimal pre-call shape for template picker when editing a 360 office visit. */
export function officeVisitTemplateDraftFromWorkflow(
  draft: EngagementWorkflowDraft,
): Record<PreCallPlanFieldKey, string> {
  const empty = {} as Record<PreCallPlanFieldKey, string>;
  const keys: PreCallPlanFieldKey[] = [
    "pre_call_hospital_name",
    "pre_call_surgeon_name",
    "observation_goal",
    "pre_observation_impact_opening_statement",
    "pre_observation_probes",
    "pre_observation_tools_resources",
    "pre_observation_value_hypothesis",
    "pre_observation_planned_close",
    "pre_observation_additional_notes",
  ];
  for (const key of keys) empty[key] = "";
  empty.observation_goal = String(draft.observation_goal ?? "");
  empty.pre_observation_probes = String(draft.sim_lab_focus ?? "");

  return empty;
}

export function workflowFieldConfigByKey(
  key: EngagementWorkflowFieldKey,
  configs: EngagementWorkflowFieldConfig[],
): EngagementWorkflowFieldConfig | undefined {
  return configs.find((f) => f.key === key);
}
