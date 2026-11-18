/**
 * Provider debrief lifecycle — mirrors Intro Call: Scheduled → Prepare → Active → Complete.
 * Single source for Mission Board labels, hrefs, and command actions.
 */

import {
  buildEngagementActiveHref,
  buildEngagementDebriefHref,
  buildEngagementPrepareForMeetingHref,
} from "@/lib/surgical-sales/engagements/engagementLifecycle";
import type { EngagementWorkflowState } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  buildEngagementSurfaceActionsFromSummary,
  engagementPreviewToSummary,
  resolveEngagementWorkflowState,
} from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import type { MissionBoardPrimaryActionKind } from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import type { ProviderDebriefEngagementPreview } from "@/lib/surgical-sales/missionBoardDebriefEngagement";
import { MISSION_BOARD_DEBRIEF_REVIEW_LABEL } from "@/lib/surgical-sales/missionBoardDebriefComplete";

export const DEBRIEF_SCHEDULE_LABEL = "Schedule Debrief";
export const DEBRIEF_PREPARE_LABEL = "Prepare Debrief";
export const DEBRIEF_START_LABEL = "Start Debrief";
export const DEBRIEF_RESUME_LABEL = "Resume Debrief";
export const DEBRIEF_COMPLETE_LABEL = "Complete Debrief";
export const DEBRIEF_DICTATE_COMPLETE_LABEL = "Dictate & Complete";
export const DEBRIEF_JUST_COMPLETE_LABEL = "Just Complete";

export const DEBRIEF_STATUS_NOT_SCHEDULED = "Debrief Not Scheduled";
export const DEBRIEF_STATUS_SCHEDULED = "Debrief Scheduled";
export const DEBRIEF_STATUS_ACTIVE = "Debrief Active";
export const DEBRIEF_STATUS_NEEDS_COMPLETION = "Debrief Needed";
export const DEBRIEF_STATUS_COMPLETE = "Debrief Complete";

/** Rep-facing debrief lifecycle phase (Intro Call pattern). */
export type DebriefLifecyclePhase =
  | "not_scheduled"
  | "scheduled"
  | "prepared"
  | "active"
  | "complete_debrief"
  | "complete";

export type DebriefLifecyclePrimaryAction = {
  phase: DebriefLifecyclePhase;
  statusLine: string;
  label: string;
  kind: MissionBoardPrimaryActionKind;
  href: string;
  /** Requires beginEngagementCall before navigating to active. */
  requiresBeginCall: boolean;
};

export function resolveDebriefWorkflowState(
  debrief: ProviderDebriefEngagementPreview,
): EngagementWorkflowState {
  const status = String(debrief.status ?? "planned").trim().toLowerCase();
  if (debrief.debrief_completed) return "closed";
  if (status === "completed" || status === "done" || status === "closed") return "completed";
  if (status === "in_progress" || status === "active") return "in_progress";
  return resolveEngagementWorkflowState({
    status,
    preparedAt: debrief.prepared_at ?? null,
    planningStatus: debrief.planning_status ?? null,
  });
}

export function resolveDebriefLifecyclePhase(
  debrief: ProviderDebriefEngagementPreview | null,
): DebriefLifecyclePhase {
  if (!debrief?.id) return "not_scheduled";
  if (debrief.debrief_completed) return "complete";

  const workflow = resolveDebriefWorkflowState(debrief);
  switch (workflow) {
    case "planned":
      return "scheduled";
    case "prepared":
      return "prepared";
    case "in_progress":
      return "active";
    case "completed":
      return "complete_debrief";
    case "closed":
      return "complete";
    default:
      return "not_scheduled";
  }
}

export function debriefLifecycleStatusLine(phase: DebriefLifecyclePhase): string {
  switch (phase) {
    case "not_scheduled":
      return DEBRIEF_STATUS_NOT_SCHEDULED;
    case "scheduled":
    case "prepared":
      return DEBRIEF_STATUS_SCHEDULED;
    case "active":
      return DEBRIEF_STATUS_ACTIVE;
    case "complete_debrief":
      return DEBRIEF_STATUS_NEEDS_COMPLETION;
    case "complete":
      return DEBRIEF_STATUS_COMPLETE;
    default:
      return DEBRIEF_STATUS_NOT_SCHEDULED;
  }
}

export function debriefLifecyclePrimaryLabel(phase: DebriefLifecyclePhase): string {
  switch (phase) {
    case "not_scheduled":
      return DEBRIEF_SCHEDULE_LABEL;
    case "scheduled":
      return DEBRIEF_PREPARE_LABEL;
    case "prepared":
      return DEBRIEF_START_LABEL;
    case "active":
      return DEBRIEF_RESUME_LABEL;
    case "complete_debrief":
      return DEBRIEF_COMPLETE_LABEL;
    case "complete":
      return MISSION_BOARD_DEBRIEF_REVIEW_LABEL;
    default:
      return DEBRIEF_SCHEDULE_LABEL;
  }
}

export function buildDebriefLifecyclePrimaryHref(
  debrief: ProviderDebriefEngagementPreview,
  phase: DebriefLifecyclePhase,
): string {
  switch (phase) {
    case "scheduled":
      return buildEngagementPrepareForMeetingHref(debrief.id);
    case "prepared":
    case "active":
      return buildEngagementActiveHref(debrief.id);
    case "complete_debrief":
      return buildEngagementDebriefHref(debrief.id);
    case "complete":
      return buildEngagementDebriefHref(debrief.id, true);
    default:
      return buildEngagementPrepareForMeetingHref(debrief.id);
  }
}

export function deriveDebriefLifecyclePrimaryAction(
  debrief: ProviderDebriefEngagementPreview | null,
): DebriefLifecyclePrimaryAction {
  const phase = resolveDebriefLifecyclePhase(debrief);

  if (!debrief?.id || phase === "not_scheduled") {
    return {
      phase,
      statusLine: debriefLifecycleStatusLine(phase),
      label: debriefLifecyclePrimaryLabel(phase),
      kind: "fast_debrief",
      href: "",
      requiresBeginCall: false,
    };
  }

  const actions = buildEngagementSurfaceActionsFromSummary(
    engagementPreviewToSummary({
      id: debrief.id,
      status: debrief.status,
      engagementType: "provider_debrief",
      prepared_at: debrief.prepared_at,
      planning_status: debrief.planning_status,
      debrief_completed: debrief.debrief_completed,
    }),
  );

  const label = debriefWorkflowPrimaryLabel(actions.primary.state);
  const href = actions.primary.href;

  if (phase === "complete_debrief" || phase === "complete") {
    return {
      phase,
      statusLine: debriefLifecycleStatusLine(phase),
      label,
      kind: "link",
      href,
      requiresBeginCall: false,
    };
  }

  return {
    phase,
    statusLine: debriefLifecycleStatusLine(phase),
    label,
    kind: actions.primaryUsesBeginCall ? "debrief_start" : "link",
    href,
    requiresBeginCall: actions.primaryUsesBeginCall,
  };
}

/** Mission Board — keep Prepare available alongside Start or Resume. */
export function debriefLifecycleShowsPrepareSecondary(phase: DebriefLifecyclePhase): boolean {
  return phase === "scheduled" || phase === "prepared" || phase === "active";
}

/** Mission Board — skip live call; capture debrief notes and outcome from the card. */
export function debriefLifecycleShowsQuickCompleteSecondary(phase: DebriefLifecyclePhase): boolean {
  return (
    phase === "scheduled" ||
    phase === "prepared" ||
    phase === "active" ||
    phase === "complete_debrief"
  );
}

/** Detail / list surfaces — align with universal engagement workflow labels. */
export function debriefWorkflowPrimaryLabel(state: EngagementWorkflowState): string {
  switch (state) {
    case "planned":
      return DEBRIEF_PREPARE_LABEL;
    case "prepared":
      return DEBRIEF_START_LABEL;
    case "in_progress":
      return DEBRIEF_RESUME_LABEL;
    case "completed":
      return DEBRIEF_COMPLETE_LABEL;
    case "closed":
      return MISSION_BOARD_DEBRIEF_REVIEW_LABEL;
    default:
      return DEBRIEF_PREPARE_LABEL;
  }
}
