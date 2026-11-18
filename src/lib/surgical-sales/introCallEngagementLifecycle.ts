/**

 * Intro call lifecycle — Mission Board discovery column labels + canonical action delegation.

 */



import type { MissionBoardPrimaryActionKind } from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import {

  buildEngagementSurfaceActionsFromSummary,

  engagementPreviewToSummary,

  resolveEngagementWorkflowState,

  resolveEngagementWorkflowStateFromSummary,

  type EngagementWorkflowState,

} from "@/lib/surgical-sales/engagements/engagementWorkflowState";



export const INTRO_SCHEDULE_LABEL = "Schedule Intro Call";

export const INTRO_PREPARE_LABEL = "Prepare Intro Call";

export const INTRO_START_LABEL = "Start Intro Call";

export const INTRO_RESUME_LABEL = "Resume Intro Call";

export const INTRO_DICTATE_COMPLETE_LABEL = "Dictate & Complete";

export const INTRO_JUST_COMPLETE_LABEL = "Mark Complete";

export const INTRO_CALL_ALREADY_HAD_CONVERSATION_LEAD = "Already had the conversation?";




export type IntroCallLifecyclePhase = "not_scheduled" | "scheduled" | "prepared" | "active";



export type ProviderIntroCallEngagementPreview = {

  id: string;

  status: string;

  prepared_at?: string | null;

  planning_status?: string | null;

};



export type IntroCallLifecyclePrimaryAction = {

  phase: IntroCallLifecyclePhase;

  label: string;

  kind: MissionBoardPrimaryActionKind;

  href: string;

  requiresBeginCall: boolean;

};



export function resolveIntroCallWorkflowState(

  intro: ProviderIntroCallEngagementPreview,

): EngagementWorkflowState {

  return resolveEngagementWorkflowState({

    status: intro.status,

    preparedAt: intro.prepared_at ?? null,

    planningStatus: intro.planning_status ?? null,

  });

}



export function resolveIntroCallLifecyclePhase(

  intro: ProviderIntroCallEngagementPreview | null,

): IntroCallLifecyclePhase {

  if (!intro?.id) return "not_scheduled";



  switch (resolveIntroCallWorkflowState(intro)) {

    case "planned":

      return "scheduled";

    case "prepared":

      return "prepared";

    case "in_progress":

      return "active";

    default:

      return "not_scheduled";

  }

}



function introLifecyclePrimaryLabel(state: EngagementWorkflowState): string {

  switch (state) {

    case "planned":

      return INTRO_PREPARE_LABEL;

    case "prepared":

      return INTRO_START_LABEL;

    case "in_progress":

      return INTRO_RESUME_LABEL;

    default:

      return INTRO_PREPARE_LABEL;

  }

}



export function deriveIntroCallLifecyclePrimaryAction(

  intro: ProviderIntroCallEngagementPreview | null,

): IntroCallLifecyclePrimaryAction {

  const phase = resolveIntroCallLifecyclePhase(intro);



  if (!intro?.id || phase === "not_scheduled") {

    return {

      phase,

      label: introLifecyclePrimaryLabel("planned"),

      kind: "link",

      href: "",

      requiresBeginCall: false,

    };

  }



  const actions = buildEngagementSurfaceActionsFromSummary(

    engagementPreviewToSummary({

      id: intro.id,

      status: intro.status,

      engagementType: "intro_call",

      prepared_at: intro.prepared_at,

      planning_status: intro.planning_status,

    }),

  );



  return {

    phase,

    label: introLifecyclePrimaryLabel(actions.primary.state),

    kind: actions.primaryUsesBeginCall ? "intro_start" : "link",

    href: actions.primary.href,

    requiresBeginCall: actions.primaryUsesBeginCall,

  };

}



/** Whether briefing prep is complete for an intro engagement preview row. */

export function introCallBriefingIsPrepared(intro: ProviderIntroCallEngagementPreview): boolean {

  return resolveIntroCallWorkflowState(intro) === "prepared" ||

    resolveIntroCallWorkflowState(intro) === "in_progress";

}



/** Mission Board / overview — Prepare secondary only when primary is Start or Resume (not duplicate planned Prepare). */

export function introCallLifecycleShowsPrepareSecondary(phase: IntroCallLifecyclePhase): boolean {

  return phase === "prepared" || phase === "active";

}



/** Mission Board — skip live call and capture intro debrief notes directly. */

export function introCallLifecycleShowsDictateCompleteSecondary(phase: IntroCallLifecyclePhase): boolean {

  return phase === "scheduled" || phase === "prepared" || phase === "active";

}

/** Provider overview — fast-log only for unprepared planned intro (not prepared/active). */

export function introCallOverviewShowsDictateComplete(phase: IntroCallLifecyclePhase): boolean {

  return phase === "scheduled";

}

export type IntroCallOverviewExecutionActions = {
  primary: { label: string; href: string };
  secondary: {
    label: string;
    engagementId: string;
    engagementStatus: string;
    engagementType: string;
  } | null;
};

function introPreviewFromSummary(engagement: ProviderEngagementSummary): ProviderIntroCallEngagementPreview {
  return {
    id: engagement.id,
    status: engagement.status,
    prepared_at: engagement.prepared_at ?? null,
    planning_status: engagement.planning_status ?? null,
  };
}

/** Provider overview mission card — intro-specific primary + Dictate & Complete secondary. */
export function buildIntroCallOverviewExecutionActions(
  engagement: ProviderEngagementSummary,
): IntroCallOverviewExecutionActions | null {
  if (normalizeEngagementType(String(engagement.engagement_type ?? "")) !== "intro_call") {
    return null;
  }

  const workflowState = resolveEngagementWorkflowStateFromSummary(engagement);
  if (workflowState === "completed" || workflowState === "closed") {
    return null;
  }

  const intro = introPreviewFromSummary(engagement);
  const lifecycle = deriveIntroCallLifecyclePrimaryAction(intro);
  const phase = resolveIntroCallLifecyclePhase(intro);

  return {
    primary: { label: lifecycle.label, href: lifecycle.href },
    secondary: introCallOverviewShowsDictateComplete(phase)
      ? {
          label: INTRO_DICTATE_COMPLETE_LABEL,
          engagementId: intro.id,
          engagementStatus: intro.status,
          engagementType: "intro_call",
        }
      : null,
  };
}


