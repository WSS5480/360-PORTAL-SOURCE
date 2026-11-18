import {
  buildEngagementActiveHref,
  buildEngagementDebriefHref,
  buildEngagementPrepareForMeetingHref,
  ENGAGEMENT_DETAIL_PREPARE_LABEL,
  ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL,
  ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL,
} from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  ENGAGEMENT_CONTINUE_DEBRIEF_LABEL,
  ENGAGEMENT_VIEW_DEBRIEF_LABEL,
} from "@/lib/surgical-sales/engagements/engagementUiLabels";
import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import {
  resolveEngagementWorkflowState,
  type EngagementWorkflowState,
  type EngagementWorkflowStateInput,
} from "@/lib/surgical-sales/engagements/engagementWorkflowState";

import {
  ENGAGEMENT_REP_LIFECYCLE_LABELS,
  type EngagementRepLifecyclePhase,
} from "@/lib/surgical-sales/engagements/engagementUiLabels";

export type { EngagementRepLifecyclePhase };
export { ENGAGEMENT_REP_LIFECYCLE_LABELS };

export function formatEngagementRepLifecycleLabel(phase: EngagementRepLifecyclePhase): string {
  return ENGAGEMENT_REP_LIFECYCLE_LABELS[phase];
}

export function resolveEngagementRepLifecyclePhaseFromWorkflow(
  workflowState: EngagementWorkflowState,
): EngagementRepLifecyclePhase {
  switch (workflowState) {
    case "planned":
    case "prepared":
      return "planned";
    case "in_progress":
      return "active";
    case "completed":
      return "debrief_needed";
    case "closed":
      return "completed";
  }
}

export function resolveEngagementRepLifecyclePhaseFromRow(
  row: Record<string, unknown>,
): EngagementRepLifecyclePhase {
  const workflowState = resolveEngagementWorkflowState({
    status: String(row.status ?? "planned"),
    isMeetingPrepared: Boolean(row.is_meeting_prepared),
    preparedAt: row.prepared_at ? String(row.prepared_at) : null,
    planningStatus: row.planning_status ? String(row.planning_status) : null,
    briefingStatus: row.briefing_status ? String(row.briefing_status) : null,
    hasDebrief: engagementHasTacticalDebrief({
      notes: row.notes ? String(row.notes) : null,
      debrief_completed: Boolean(row.debrief_completed),
      debrief_completed_at: row.debrief_completed_at ? String(row.debrief_completed_at) : null,
    }),
    engagement: row,
  });
  return resolveEngagementRepLifecyclePhaseFromWorkflow(workflowState);
}

export function resolveEngagementRepLifecycleFromInput(
  input: EngagementWorkflowStateInput,
): { phase: EngagementRepLifecyclePhase; workflowState: EngagementWorkflowState } {
  const workflowState = resolveEngagementWorkflowState(input);
  return {
    workflowState,
    phase: resolveEngagementRepLifecyclePhaseFromWorkflow(workflowState),
  };
}

/** Single primary next action per phase — matches detail hub CTAs. */
export function engagementRepLifecycleNextActionLabel(
  workflowState: EngagementWorkflowState,
): string {
  switch (workflowState) {
    case "planned":
      return ENGAGEMENT_DETAIL_PREPARE_LABEL;
    case "prepared":
      return ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL;
    case "in_progress":
      return ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL;
    case "completed":
      return ENGAGEMENT_CONTINUE_DEBRIEF_LABEL;
    case "closed":
      return ENGAGEMENT_VIEW_DEBRIEF_LABEL;
  }
}

export function engagementRepLifecycleNextActionHref(
  engagementId: string,
  workflowState: EngagementWorkflowState,
): string {
  switch (workflowState) {
    case "planned":
      return buildEngagementPrepareForMeetingHref(engagementId);
    case "prepared":
      return buildEngagementPrepareForMeetingHref(engagementId);
    case "in_progress":
      return buildEngagementActiveHref(engagementId);
    case "completed":
      return buildEngagementDebriefHref(engagementId);
    case "closed":
      return buildEngagementDebriefHref(engagementId, true);
  }
}

export function engagementRepLifecycleBadgeVariant(
  phase: EngagementRepLifecyclePhase,
): "planned" | "active" | "debrief_needed" | "completed" {
  return phase;
}
