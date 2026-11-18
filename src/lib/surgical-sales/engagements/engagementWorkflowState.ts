import {
  buildEngagementDetailHref,
  buildEngagementHubHref,
  buildEngagementLifecyclePrimaryHref,
  buildEngagementActiveHref,
  buildEngagementPrepareForMeetingHref,
  ENGAGEMENT_DETAIL_PREPARE_LABEL,
  engagementLifecyclePrimaryCtaLabel,
} from "@/lib/surgical-sales/engagements/engagementLifecycle";

import { resolveEngagementPlanningStatus } from "@/lib/surgical-sales/engagements/engagementPlanningModel";

import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import { ENGAGEMENT_REP_LIFECYCLE_LABELS } from "@/lib/surgical-sales/engagements/engagementUiLabels";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { debriefWorkflowPrimaryLabel } from "@/lib/surgical-sales/debriefEngagementLifecycle";



/** Canonical engagement lifecycle for navigation (maps to four phases). */

export type EngagementWorkflowState =

  | "planned"

  | "prepared"

  | "in_progress"

  | "completed"

  | "closed";



export const ENGAGEMENT_WORKFLOW_STATE_LABELS: Record<EngagementWorkflowState, string> = {
  planned: ENGAGEMENT_REP_LIFECYCLE_LABELS.planned,
  prepared: ENGAGEMENT_REP_LIFECYCLE_LABELS.planned,
  in_progress: ENGAGEMENT_REP_LIFECYCLE_LABELS.active,
  completed: ENGAGEMENT_REP_LIFECYCLE_LABELS.debrief_needed,
  closed: ENGAGEMENT_REP_LIFECYCLE_LABELS.completed,
};

export function engagementWorkflowRepLifecycleLabel(state: EngagementWorkflowState): string {
  switch (state) {
    case "planned":
    case "prepared":
      return ENGAGEMENT_REP_LIFECYCLE_LABELS.planned;
    case "in_progress":
      return ENGAGEMENT_REP_LIFECYCLE_LABELS.active;
    case "completed":
      return ENGAGEMENT_REP_LIFECYCLE_LABELS.debrief_needed;
    case "closed":
      return ENGAGEMENT_REP_LIFECYCLE_LABELS.completed;
  }
}



/** Exactly one primary CTA label per workflow state. */

export function engagementWorkflowPrimaryCtaLabel(

  state: EngagementWorkflowState,

  _engagementType?: string,

): string {

  return engagementLifecyclePrimaryCtaLabel(state);

}



export const ENGAGEMENT_WORKFLOW_NEXT_STEP: Record<EngagementWorkflowState, string> = {

  planned: "Open Prepare and build the briefing.",

  prepared: "Start the engagement when you are with the provider.",

  in_progress: "Resume on the active engagement screen.",

  completed: "Capture the debrief while details are fresh.",

  closed: "Review the engagement record.",

};



export type EngagementWorkflowStateInput = {

  status: string;

  isMeetingPrepared?: boolean;

  preparedAt?: string | null;

  planningStatus?: string | null;

  briefingStatus?: string | null;

  hasDebrief?: boolean;

  engagement?: Record<string, unknown> | null;

};



export type EngagementPrimaryAction = {

  label: string;

  href: string;

  state: EngagementWorkflowState;

};



export function isEngagementBriefingPrepared(input: EngagementWorkflowStateInput): boolean {

  if (input.isMeetingPrepared || input.preparedAt) return true;

  const planning =

    input.planningStatus?.trim() ||

    input.briefingStatus?.trim() ||

    (input.engagement ? resolveEngagementPlanningStatus(input.engagement) : "");

  return planning === "planned";

}



export function resolveEngagementWorkflowState(

  input: EngagementWorkflowStateInput,

): EngagementWorkflowState {

  const status = String(input.status ?? "planned").toLowerCase();



  if (status === "completed") {

    const hasDebrief =

      input.hasDebrief ??

      (input.engagement ? engagementHasTacticalDebrief(input.engagement as ProviderEngagementSummary) : false);

    return hasDebrief ? "closed" : "completed";

  }



  if (status === "in_progress") return "in_progress";



  if (status === "planned" || status === "cancelled") {

    return isEngagementBriefingPrepared(input) ? "prepared" : "planned";

  }



  return isEngagementBriefingPrepared(input) ? "prepared" : "planned";

}



export function resolveEngagementWorkflowStateFromSummary(

  row: ProviderEngagementSummary,

): EngagementWorkflowState {

  return resolveEngagementWorkflowState({

    status: row.status,

    isMeetingPrepared: row.is_meeting_prepared,

    preparedAt: row.prepared_at,

    planningStatus: row.planning_status ?? row.briefing_status,

    hasDebrief: engagementHasTacticalDebrief(row),

    engagement: row as unknown as Record<string, unknown>,

  });

}



/** Mission/list navigation — routes to the correct phase screen. */

export function buildEngagementOpenHref(

  engagementId: string,

  state: EngagementWorkflowState,

): string {

  return buildEngagementLifecyclePrimaryHref(engagementId, state);

}



export function buildEngagementOpenHrefFromSummary(row: ProviderEngagementSummary): string {

  return buildEngagementPrimaryActionFromSummary(row).href;

}



export function buildEngagementPrimaryAction(input: {

  engagementId: string;

  state: EngagementWorkflowState;

  engagementType?: string;

}): EngagementPrimaryAction {

  return {

    state: input.state,

    label: engagementWorkflowPrimaryCtaLabel(input.state, input.engagementType),

    href: buildEngagementOpenHref(input.engagementId, input.state),

  };

}



export function buildEngagementPrimaryActionFromSummary(

  row: ProviderEngagementSummary,

): EngagementPrimaryAction {

  if (row.is_legacy_draft && row.legacy_new_engagement_href) {

    return {

      state: "planned",

      label: "Migrate",

      href: row.legacy_new_engagement_href,

    };

  }

  const state = resolveEngagementWorkflowStateFromSummary(row);

  const action = buildEngagementPrimaryAction({
    engagementId: row.id,
    state,
    engagementType: row.engagement_type,
  });

  if (isProviderDebriefEngagement(String(row.engagement_type ?? ""))) {
    return {
      ...action,
      label: debriefWorkflowPrimaryLabel(state),
    };
  }

  return action;
}

export type EngagementSurfacePrepareAction = {
  label: string;
  href: string;
};

export type EngagementSurfaceActions = {
  primary: EngagementPrimaryAction;
  prepareSecondary: EngagementSurfacePrepareAction | null;
  primaryUsesBeginCall: boolean;
};

/** List / provider surfaces — keep Prepare alongside Start or Resume. */
export function engagementShowsPrepareSecondary(state: EngagementWorkflowState): boolean {
  return state === "prepared" || state === "in_progress";
}

function buildEngagementPrepareSecondaryAction(
  engagementId: string,
  engagementType?: string | null,
): EngagementSurfacePrepareAction {
  if (isProviderDebriefEngagement(String(engagementType ?? ""))) {
    return {
      label: debriefWorkflowPrimaryLabel("planned"),
      href: buildEngagementPrepareForMeetingHref(engagementId),
    };
  }
  return {
    label: ENGAGEMENT_DETAIL_PREPARE_LABEL,
    href: buildEngagementPrepareForMeetingHref(engagementId),
  };
}

/** Provider engagement list, upcoming preview, and similar summary surfaces. */
export function buildEngagementSurfaceActionsFromSummary(
  row: ProviderEngagementSummary,
): EngagementSurfaceActions {
  const primary = buildEngagementPrimaryActionFromSummary(row);
  const state = primary.state;
  const primaryUsesBeginCall = engagementWorkflowStateUsesBeginCallAction(state);

  let primaryHref = primary.href;
  if (state === "prepared" || state === "in_progress") {
    primaryHref = buildEngagementActiveHref(row.id);
  }

  const prepareSecondary = engagementShowsPrepareSecondary(state)
    ? buildEngagementPrepareSecondaryAction(row.id, row.engagement_type)
    : null;

  return {
    primary: {
      ...primary,
      href: primaryHref,
    },
    prepareSecondary,
    primaryUsesBeginCall,
  };
}



export function engagementWorkflowStateIsLiveWorkspace(state: EngagementWorkflowState): boolean {

  return state === "in_progress";

}



export function engagementWorkflowStateUsesBeginCallAction(state: EngagementWorkflowState): boolean {

  return state === "prepared";

}

/** Portal active session — only after briefing prep or when already live. */
export function engagementWorkflowStateAllowsBeginCall(state: EngagementWorkflowState): boolean {
  return state === "prepared" || state === "in_progress";
}

export function resolveEngagementWorkflowStateAllowsBeginCall(
  input: EngagementWorkflowStateInput,
): boolean {
  return engagementWorkflowStateAllowsBeginCall(resolveEngagementWorkflowState(input));
}

/** Minimal summary row for MB preview types → canonical surface actions. */
export function engagementPreviewToSummary(input: {
  id: string;
  status: string;
  engagementType: string;
  prepared_at?: string | null;
  planning_status?: string | null;
  debrief_completed?: boolean;
  notes?: string | null;
}): ProviderEngagementSummary {
  const planningStatus = String(input.planning_status ?? "not_planned");
  return {
    id: input.id,
    engagement_type: input.engagementType,
    engagement_type_label: input.engagementType,
    status: input.status,
    status_label: input.status,
    prepared_at: input.prepared_at ?? null,
    planning_status: planningStatus as ProviderEngagementSummary["planning_status"],
    planning_status_label: planningStatus,
    briefing_status: planningStatus as ProviderEngagementSummary["briefing_status"],
    briefing_status_label: planningStatus,
    pre_call_filled: 0,
    pre_call_total: 0,
    pre_call_complete: false,
    outcome_label: "",
    debrief_completed: input.debrief_completed,
    notes: input.notes ?? null,
  };
}



export function engagementWorkflowStateShowsDebriefFooter(_state: EngagementWorkflowState): boolean {

  return false;

}



/** Hub record always uses detail route for openHref. */

export function buildEngagementRecordOpenHref(engagementId: string): string {

  return buildEngagementHubHref(engagementId);

}



export function buildEngagementDetailHrefOnly(engagementId: string): string {

  return buildEngagementDetailHref(engagementId);

}


