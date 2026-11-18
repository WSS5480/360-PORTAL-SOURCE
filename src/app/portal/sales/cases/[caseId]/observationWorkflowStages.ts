import {
  OBSERVATION_CASE_STAGE_LABELS,
  type ObservationCaseWorkflowStageId,
} from "@/lib/surgical-sales/observationCaseWorkflowFields";
import { PRE_CALL_PLAN_WORKFLOW_STAGE_ALIASES } from "@/lib/surgical-sales/preCallPlanCompat";

export type ObservationWorkflowStageId =
  | "setup"
  | "live"
  | "debrief"
  | "follow_up"
  | "routing";

export const OBSERVATION_WORKFLOW_STAGE_ORDER: ObservationWorkflowStageId[] = [
  "setup",
  "live",
  "debrief",
  "follow_up",
  "routing",
];

export type MobileWorkflowStageRow = {
  id: ObservationWorkflowStageId;
  title: string;
  filled: number;
  total: number;
  status: "Not started" | "In progress" | "Completed";
};

const VALID_STAGE_IDS = new Set<ObservationWorkflowStageId>(OBSERVATION_WORKFLOW_STAGE_ORDER);

/** @deprecated aliases → canonical stage ids (legacy pre-call URLs map to setup; plan on engagement). */
const STAGE_ALIASES: Record<string, ObservationWorkflowStageId> = {
  pre: "setup",
  planning: "setup",
  pre_call_plan: "setup",
  ...Object.fromEntries(
    Object.entries(PRE_CALL_PLAN_WORKFLOW_STAGE_ALIASES).map(([k]) => [k, "setup" as const]),
  ),
};

/** Short labels for mobile case detail workflow stepper. */
/** Case workflow mobile labels (Pre-Call Plan lives on Engagements, not case workflow). */
export const OBSERVATION_MOBILE_STAGE_LABELS: Record<ObservationWorkflowStageId, string> = {
  setup: "Case Setup",
  live: "Live Observation",
  debrief: "Debrief",
  follow_up: "Follow-Up",
  routing: "Outcome Routing",
};

export function observationWorkflowStageLabel(
  stageId: ObservationWorkflowStageId,
  options?: { mobile?: boolean },
): string {
  if (options?.mobile) return OBSERVATION_MOBILE_STAGE_LABELS[stageId];
  return OBSERVATION_CASE_STAGE_LABELS[stageId];
}

export function observationWorkflowMobileStageLabel(stageId: ObservationWorkflowStageId): string {
  return OBSERVATION_MOBILE_STAGE_LABELS[stageId];
}

export function normalizeObservationWorkflowStageId(
  stage: string | null | undefined,
): ObservationWorkflowStageId | null {
  if (!stage) return null;
  const v = stage.trim();
  if (STAGE_ALIASES[v]) return STAGE_ALIASES[v];
  return VALID_STAGE_IDS.has(v as ObservationWorkflowStageId) ? (v as ObservationWorkflowStageId) : null;
}

export function mobileWorkflowStageStatus(filled: number, total: number): MobileWorkflowStageRow["status"] {
  if (filled <= 0) return "Not started";
  if (filled >= total && total > 0) return "Completed";
  return "In progress";
}
