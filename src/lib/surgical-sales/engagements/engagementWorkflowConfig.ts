import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import {
  ENGAGEMENT_TYPE_LABELS,
  HIDDEN_ENGAGEMENT_TYPES,
  MVP_LIGHTWEIGHT_ENGAGEMENT_TYPES,
  MVP_STRATEGIC_ENGAGEMENT_TYPES,
  type EngagementType,
  normalizeEngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  OFFICE_VISIT_360_FIELD_CONFIGS,
  OFFICE_VISIT_360_PLANNING_DESCRIPTION,
  OFFICE_VISIT_360_PLANNING_LABEL,
} from "@/lib/surgical-sales/engagements/officeVisit360Workflow";

export type EngagementWorkflowMode = "strategic" | "lightweight";

/** Stored on engagements when rep overrides planning depth (legacy reactivation records). */
export type EngagementWorkflowModeOverride = EngagementWorkflowMode;

/** Hands-on office / sim-lab — dedicated visit-plan workflow (not generic pre-call plan). */
export const OFFICE_VISIT_ENGAGEMENT_TYPES = ["office_visit_360"] as const satisfies readonly EngagementType[];

/** Strategic MVP types — full Pre-Call Plan / playbook templates. */
export const STRATEGIC_ENGAGEMENT_TYPES = [...MVP_STRATEGIC_ENGAGEMENT_TYPES] as const satisfies readonly EngagementType[];

/** Lightweight MVP types — purpose, notes, next action, follow-up tasks only. */
export const LIGHTWEIGHT_ENGAGEMENT_TYPES = [...MVP_LIGHTWEIGHT_ENGAGEMENT_TYPES] as const satisfies readonly EngagementType[];

/** Legacy types that still resolve to strategic planning when editing existing records. */
const LEGACY_STRATEGIC_ENGAGEMENT_TYPES = ["evaluation_planning", "preference_card_discussion"] as const;

/** Strategic Pre-Call Plan fields (hospital/surgeon set from context on save). */
export const STRATEGIC_PLAN_FIELD_KEYS: PreCallPlanFieldKey[] = [
  "observation_goal",
  "pre_observation_impact_opening_statement",
  "pre_observation_probes",
  "pre_observation_tools_resources",
  "pre_observation_value_hypothesis",
  "pre_observation_planned_close",
  "pre_observation_additional_notes",
];

export type EngagementWorkflowFieldKey =
  | PreCallPlanFieldKey
  | "engagement_purpose"
  | "next_action"
  | "follow_up_tasks"
  | "sim_lab_focus"
  | "products_to_demonstrate"
  | "attendees"
  | "hands_on_goals"
  | "adoption_signals_to_watch";

export type EngagementWorkflowFieldConfig = {
  key: EngagementWorkflowFieldKey;
  label: string;
  helper?: string;
  rows: number;
  /** DB column on surgical_sales_engagements */
  storageKey: string;
};

export const LIGHTWEIGHT_FIELD_CONFIGS: EngagementWorkflowFieldConfig[] = [
  {
    key: "engagement_purpose",
    label: "Purpose",
    helper: "Why this touchpoint — keep it brief.",
    rows: 2,
    storageKey: "engagement_purpose",
  },
  {
    key: "pre_observation_additional_notes",
    label: "Notes",
    rows: 4,
    storageKey: "pre_observation_additional_notes",
  },
  {
    key: "next_action",
    label: "Next action",
    rows: 2,
    storageKey: "next_action",
  },
  {
    key: "follow_up_tasks",
    label: "Follow-up tasks",
    helper: "Tasks to complete after this interaction.",
    rows: 3,
    storageKey: "follow_up_tasks",
  },
];

const STRATEGIC_FIELD_CONFIGS: EngagementWorkflowFieldConfig[] = STRATEGIC_PLAN_FIELD_KEYS.map((key) => {
  const labels: Partial<Record<PreCallPlanFieldKey, { label: string; helper?: string; rows: number }>> = {
    observation_goal: {
      label: "SMART objective",
      helper: "Specific, measurable outcome — volume, workflow step, and dated next field action.",
      rows: 3,
    },
    pre_observation_impact_opening_statement: { label: "Opening statement", rows: 3 },
    pre_observation_probes: {
      label: "Probes / questions",
      helper: "OR workflow, access path, observation readiness, and process barriers.",
      rows: 5,
    },
    pre_observation_tools_resources: { label: "Tools / resources", rows: 4 },
    pre_observation_value_hypothesis: { label: "Value hypothesis", rows: 4 },
    pre_observation_planned_close: { label: "Planned close", rows: 4 },
    pre_observation_additional_notes: { label: "Strategic notes", rows: 4 },
  };
  const meta = labels[key] ?? { label: key, rows: 3 };
  return { key, ...meta, storageKey: key };
});

export type EngagementTypeGroup = {
  id: "strategic" | "lightweight";
  label: string;
  description: string;
  types: EngagementType[];
};

export const ENGAGEMENT_TYPE_GROUPS: EngagementTypeGroup[] = [
  {
    id: "strategic",
    label: "Strategic engagements",
    description: "Plan the interaction — goals, talking points, optional playbooks, and visit or pre-call details.",
    types: [...MVP_STRATEGIC_ENGAGEMENT_TYPES],
  },
  {
    id: "lightweight",
    label: "Operational touchpoints",
    description: "Quick operational prep — purpose, notes, next action, and follow-up. No full pre-call plan.",
    types: [...MVP_LIGHTWEIGHT_ENGAGEMENT_TYPES],
  },
];

function isLegacyStrategicType(type: EngagementType): boolean {
  return (LEGACY_STRATEGIC_ENGAGEMENT_TYPES as readonly string[]).includes(type);
}

export function defaultWorkflowModeForType(engagementType: string | null | undefined): EngagementWorkflowMode {
  const type = normalizeEngagementType(engagementType);
  if (!type) return "strategic";
  if ((LIGHTWEIGHT_ENGAGEMENT_TYPES as readonly string[]).includes(type)) return "lightweight";
  if (type === "evaluation_follow_up") return "lightweight";
  if (type === "peer_discussion") return "lightweight";
  if (isLegacyStrategicType(type)) return "strategic";
  if ((HIDDEN_ENGAGEMENT_TYPES as readonly string[]).includes(type) && !isLegacyStrategicType(type)) {
    return "lightweight";
  }
  return "strategic";
}

export function resolveEngagementWorkflowMode(
  engagementType: string | null | undefined,
  workflowModeOverride?: EngagementWorkflowModeOverride | null,
): EngagementWorkflowMode {
  if (workflowModeOverride === "strategic" || workflowModeOverride === "lightweight") {
    return workflowModeOverride;
  }
  return defaultWorkflowModeForType(engagementType);
}

export function isOfficeVisitEngagement(engagementType: string | null | undefined): boolean {
  return normalizeEngagementType(engagementType) === "office_visit_360";
}

export function isMvpStrategicEngagementType(engagementType: string | null | undefined): boolean {
  const type = normalizeEngagementType(engagementType);
  return type ? (MVP_STRATEGIC_ENGAGEMENT_TYPES as readonly string[]).includes(type) : false;
}

export function isMvpLightweightEngagementType(engagementType: string | null | undefined): boolean {
  const type = normalizeEngagementType(engagementType);
  return type ? (MVP_LIGHTWEIGHT_ENGAGEMENT_TYPES as readonly string[]).includes(type) : false;
}

/** Strategic prep UI: goal, talking points, playbooks, and full planning fields. */
export function usesStrategicPreparationUi(engagementType: string | null | undefined): boolean {
  return isMvpStrategicEngagementType(engagementType);
}

/** @deprecated Reactivation is lightweight-only in MVP; kept for legacy records with workflow_mode set. */
export function requiresWorkflowModeChoice(_engagementType: string | null | undefined): boolean {
  return false;
}

export function getPlanningStepLabel(
  mode: EngagementWorkflowMode,
  engagementType?: string | null,
): string {
  if (isOfficeVisitEngagement(engagementType)) return OFFICE_VISIT_360_PLANNING_LABEL;
  return mode === "strategic" ? "Pre-Call Plan" : "Planning";
}

export function getPlanningStepDescription(
  mode: EngagementWorkflowMode,
  engagementType: string | null | undefined,
): string {
  if (mode === "lightweight") {
    return "Quick planning — purpose, notes, and next steps. No full Pre-Call Plan.";
  }
  if (isOfficeVisitEngagement(engagementType)) return OFFICE_VISIT_360_PLANNING_DESCRIPTION;
  return "Strategic Pre-Call Plan for this interaction.";
}

export function workflowFieldConfigsForMode(
  mode: EngagementWorkflowMode,
  engagementType: string | null | undefined,
): EngagementWorkflowFieldConfig[] {
  if (isOfficeVisitEngagement(engagementType)) return [...OFFICE_VISIT_360_FIELD_CONFIGS];
  const strategic = mode === "strategic";
  return strategic ? [...STRATEGIC_FIELD_CONFIGS] : [...LIGHTWEIGHT_FIELD_CONFIGS];
}

export function supportsOfficeVisit360Workflow(engagementType: string | null | undefined): boolean {
  return isOfficeVisitEngagement(engagementType);
}

export function engagementTypePickerLabel(type: EngagementType): string {
  return ENGAGEMENT_TYPE_LABELS[type];
}

export function supportsPlaybookTemplates(
  mode: EngagementWorkflowMode,
  engagementType?: string | null,
): boolean {
  if (isOfficeVisitEngagement(engagementType)) return true;
  if (mode !== "strategic") return false;
  const type = normalizeEngagementType(engagementType);
  if (!type) return false;
  if ((HIDDEN_ENGAGEMENT_TYPES as readonly string[]).includes(type)) return isLegacyStrategicType(type);
  return (STRATEGIC_ENGAGEMENT_TYPES as readonly string[]).includes(type);
}
