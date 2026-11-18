import {
  ENGAGEMENT_CONTINUE_DEBRIEF_LABEL,
  ENGAGEMENT_DEBRIEF_LABEL,
  ENGAGEMENT_VIEW_DEBRIEF_LABEL,
} from "@/lib/surgical-sales/engagements/engagementUiLabels";
import type { EngagementWorkflowState } from "@/lib/surgical-sales/engagements/engagementWorkflowState";

export function buildEngagementDetailHref(engagementId: string): string {
  return `/portal/sales/engagements/${encodeURIComponent(engagementId)}`;
}

export function buildEngagementPrepareForMeetingHref(engagementId: string): string {
  return `${buildEngagementDetailHref(engagementId)}/prepare`;
}

/** Active (in-progress) engagement execution workspace. */
export function buildEngagementActiveHref(engagementId: string): string {
  return `${buildEngagementDetailHref(engagementId)}/active`;
}

/** @deprecated Use buildEngagementActiveHref */
export const buildEngagementCallHref = buildEngagementActiveHref;

/** @deprecated Use buildEngagementActiveHref */
export const buildEngagementBeginCallHref = buildEngagementActiveHref;

/** Four user-facing engagement phases. */
export type EngagementLifecyclePhase = "engagement" | "prepare" | "active" | "debrief";

/** @deprecated Use EngagementLifecyclePhase with `active` instead of `call` */
export type EngagementLifecyclePhaseLegacy = EngagementLifecyclePhase | "call";

export const ENGAGEMENT_LIFECYCLE_PHASE_LABELS: Record<EngagementLifecyclePhase, string> = {
  engagement: "Engagement",
  prepare: "Prepare",
  active: "Active Engagement",
  debrief: "Debrief",
};

export const ENGAGEMENT_DETAIL_PREPARE_LABEL = "Prepare";
export const ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL = "Start Engagement";
export const ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL = "Resume Engagement";
export const ENGAGEMENT_PREPARE_START_ENGAGEMENT_LABEL = "Start Engagement";
export const ENGAGEMENT_END_ENGAGEMENT_LABEL = "End Engagement";

/** @deprecated Use ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL */
export const ENGAGEMENT_DETAIL_START_CALL_LABEL = ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL;
/** @deprecated Use ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL */
export const ENGAGEMENT_DETAIL_CONTINUE_CALL_LABEL = ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL;
/** @deprecated Use ENGAGEMENT_PREPARE_START_ENGAGEMENT_LABEL */
export const ENGAGEMENT_PREPARE_START_CALL_LABEL = ENGAGEMENT_PREPARE_START_ENGAGEMENT_LABEL;
/** @deprecated Use ENGAGEMENT_END_ENGAGEMENT_LABEL */
export const ENGAGEMENT_CALL_END_LABEL = ENGAGEMENT_END_ENGAGEMENT_LABEL;
/** @deprecated Use ENGAGEMENT_END_ENGAGEMENT_LABEL */
export const ENGAGEMENT_CALL_COMPLETE_LABEL = ENGAGEMENT_END_ENGAGEMENT_LABEL;

export function buildEngagementDebriefHref(engagementId: string, reviewMode = false): string {
  const base = `${buildEngagementDetailHref(engagementId)}/debrief`;
  if (!reviewMode) return base;
  return `${base}?mode=review`;
}

/** @deprecated Use buildEngagementDebriefHref */
export function buildDebriefHrefFromPrepare(prepareHref: string, reviewMode: boolean): string {
  const engagementId = prepareHref.match(/\/engagements\/([^/]+)/)?.[1];
  if (!engagementId) return `${prepareHref}?panel=debrief${reviewMode ? "&mode=review" : ""}`;
  return buildEngagementDebriefHref(engagementId, reviewMode);
}

export function resolveEngagementLifecyclePhase(
  workflowState: EngagementWorkflowState,
): EngagementLifecyclePhase {
  switch (workflowState) {
    case "planned":
    case "prepared":
      return "prepare";
    case "in_progress":
      return "active";
    case "completed":
      return "debrief";
    case "closed":
      return "engagement";
  }
}

/** Primary list / mission CTA — one obvious next step. */
export function engagementLifecyclePrimaryCtaLabel(
  workflowState: EngagementWorkflowState,
): string {
  switch (workflowState) {
    case "planned":
    case "prepared":
      return workflowState === "planned"
        ? ENGAGEMENT_DETAIL_PREPARE_LABEL
        : ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL;
    case "in_progress":
      return ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL;
    case "completed":
      return ENGAGEMENT_CONTINUE_DEBRIEF_LABEL;
    case "closed":
      return ENGAGEMENT_VIEW_DEBRIEF_LABEL;
  }
}

export function buildEngagementLifecyclePrimaryHref(
  engagementId: string,
  workflowState: EngagementWorkflowState,
): string {
  switch (workflowState) {
    case "planned":
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

/** Provider tab and record hub — always land on engagement detail. */
export function buildEngagementHubHref(engagementId: string): string {
  return buildEngagementDetailHref(engagementId);
}

export function engagementDetailActiveActionLabel(workflowState: EngagementWorkflowState): string {
  if (workflowState === "in_progress") return ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL;
  if (workflowState === "completed") return ENGAGEMENT_CONTINUE_DEBRIEF_LABEL;
  if (workflowState === "closed") return ENGAGEMENT_VIEW_DEBRIEF_LABEL;
  if (workflowState === "planned") return ENGAGEMENT_DETAIL_PREPARE_LABEL;
  return ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL;
}

/** @deprecated Use engagementDetailActiveActionLabel */
export const engagementDetailCallActionLabel = engagementDetailActiveActionLabel;

export function engagementDetailActiveActionHref(
  engagementId: string,
  workflowState: EngagementWorkflowState,
): string {
  if (workflowState === "completed") return buildEngagementDebriefHref(engagementId);
  if (workflowState === "closed") {
    return buildEngagementDebriefHref(engagementId, true);
  }
  return buildEngagementActiveHref(engagementId);
}

/** @deprecated Use engagementDetailActiveActionHref */
export const engagementDetailCallActionHref = engagementDetailActiveActionHref;
