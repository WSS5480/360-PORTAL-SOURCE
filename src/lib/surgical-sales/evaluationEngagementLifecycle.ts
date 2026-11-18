/**

 * Evaluation engagement lifecycle — Mission Board evaluation column labels + canonical actions.

 */



import {

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

import type { ProviderEvaluationEngagementPreview } from "@/lib/surgical-sales/missionBoardEvaluationEngagement";



export const EVALUATION_PREPARE_LABEL = "Prepare Evaluation";

export const EVALUATION_START_LABEL = "Start Evaluation";

export const EVALUATION_RESUME_LABEL = "Resume Evaluation";

export const EVALUATION_COMPLETE_LABEL = "Complete Evaluation";

export const EVALUATION_REVIEW_LABEL = "Review Evaluation";



export type EvaluationLifecyclePhase =

  | "not_scheduled"

  | "scheduled"

  | "prepared"

  | "active"

  | "complete";



export type EvaluationLifecyclePrimaryAction = {

  phase: EvaluationLifecyclePhase;

  label: string;

  kind: MissionBoardPrimaryActionKind;

  href: string;

  requiresBeginCall: boolean;

  engagementId: string | null;

};



export function resolveEvaluationWorkflowState(

  preview: ProviderEvaluationEngagementPreview,

): EngagementWorkflowState {

  const status = String(preview.status ?? "planned").trim().toLowerCase();

  if (status === "completed" || status === "done" || status === "closed") return "completed";

  if (status === "in_progress" || status === "active") return "in_progress";

  return resolveEngagementWorkflowState({

    status,

    preparedAt: preview.prepared_at ?? null,

    planningStatus: preview.planning_status ?? null,

  });

}



export function resolveEvaluationLifecyclePhase(

  preview: ProviderEvaluationEngagementPreview | null,

): EvaluationLifecyclePhase {

  if (!preview?.id) return "not_scheduled";

  switch (resolveEvaluationWorkflowState(preview)) {

    case "planned":

      return "scheduled";

    case "prepared":

      return "prepared";

    case "in_progress":

      return "active";

    case "completed":

    case "closed":

      return "complete";

    default:

      return "not_scheduled";

  }

}



function evaluationLifecyclePrimaryLabel(state: EngagementWorkflowState): string {

  switch (state) {

    case "planned":

      return EVALUATION_PREPARE_LABEL;

    case "prepared":

      return EVALUATION_START_LABEL;

    case "in_progress":

      return EVALUATION_RESUME_LABEL;

    case "completed":

      return EVALUATION_COMPLETE_LABEL;

    case "closed":

      return EVALUATION_REVIEW_LABEL;

    default:

      return EVALUATION_PREPARE_LABEL;

  }

}



export function deriveEvaluationLifecyclePrimaryAction(

  preview: ProviderEvaluationEngagementPreview | null,

): EvaluationLifecyclePrimaryAction | null {

  const phase = resolveEvaluationLifecyclePhase(preview);

  if (!preview?.id || phase === "not_scheduled") return null;



  const actions = buildEngagementSurfaceActionsFromSummary(

    engagementPreviewToSummary({

      id: preview.id,

      status: preview.status,

      engagementType: preview.engagement_type ?? "evaluation_planning",

      prepared_at: preview.prepared_at,

      planning_status: preview.planning_status,

    }),

  );



  if (phase === "complete") {

    return {

      phase,

      label: EVALUATION_REVIEW_LABEL,

      kind: "link",

      href: buildEngagementDebriefHref(preview.id, true),

      requiresBeginCall: false,

      engagementId: preview.id,

    };

  }



  return {

    phase,

    label: evaluationLifecyclePrimaryLabel(actions.primary.state),

    kind: actions.primaryUsesBeginCall ? "evaluation_start" : "link",

    href: actions.primary.href,

    requiresBeginCall: actions.primaryUsesBeginCall,

    engagementId: preview.id,

  };

}



/** Mission Board — keep Prepare available alongside Start or Resume. */

export function evaluationLifecycleShowsPrepareSecondary(phase: EvaluationLifecyclePhase): boolean {

  return phase === "scheduled" || phase === "prepared" || phase === "active";

}



/** Rep-facing lifecycle line for Mission Board status modal and card copy. */

export function evaluationLifecycleStatusLine(phase: EvaluationLifecyclePhase): string {

  switch (phase) {

    case "not_scheduled":

      return "Not scheduled";

    case "scheduled":

      return "Scheduled";

    case "prepared":

      return "Prepared";

    case "active":

      return "Active";

    case "complete":

      return "Complete";

    default:

      return "Unknown";

  }

}



export function buildEvaluationPrepareHref(engagementId: string): string {

  return buildEngagementPrepareForMeetingHref(engagementId);

}


