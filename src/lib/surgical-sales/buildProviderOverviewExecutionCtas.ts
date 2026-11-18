/**

 * Provider overview — primary suggested action + flexible quick actions.

 * Observation stage uses observation cases, not OR visit engagements.

 */



import {

  observationPermissionConfirmedOnFile,

  resolveObservationPermissionStage,

} from "@/lib/surgical-sales/observationPermissionModel";

import {

  buildProviderObservationCaseHref,

  buildProviderObservationCaseWorkflowHref,

} from "@/lib/surgical-sales/providerDirectoryLinks";

import { buildProviderEngagementTypeHref } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import {
  deriveMissionBoardDebriefCardLabel,
} from "@/lib/surgical-sales/missionBoardDebriefEngagement";
import { resolveProviderDebriefEngagementFromSummaries } from "@/lib/surgical-sales/missionBoardEngagementCommand";
import { MISSION_BOARD_DEBRIEF_CREATE_LABEL } from "@/lib/surgical-sales/missionBoardDebriefLauncherUx";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { PROVIDER_OBSERVATION_TARGET } from "@/lib/surgical-sales/providerObservationProgress";
import { hasUpcomingIntroEngagement } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import { PROVIDER_FIELD_OPS_CTA } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import {
  buildProviderObservationCaseRollup,
  observationQueuePrimaryHref,
  observationQueuePrimaryLabel,
  resolveScheduledObservationCases,
} from "@/lib/surgical-sales/providerObservationCaseCollection";
import {
  isRelationshipFirstDiscovery,
} from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import {
  normalizeSalesPathwayStageId,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import {
  countObservedProcedures,
  hasProductFitValidated,
  type PathwayGateEngagementRef,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";
import {
  deriveDebriefLifecyclePrimaryAction,
  debriefLifecycleStatusLine,
  type DebriefLifecyclePhase,
} from "@/lib/surgical-sales/debriefEngagementLifecycle";
import { providerDebriefNotesComplete } from "@/lib/surgical-sales/missionBoardDebriefCardStatus";
import { MISSION_BOARD_DEBRIEF_REVIEW_LABEL } from "@/lib/surgical-sales/missionBoardDebriefComplete";
import {
  deriveProviderEvaluationPath,
  hasProviderSelectedEvaluationPath,
  MISSION_BOARD_CHOOSE_EVALUATION_PATH_LABEL,
  resolveEvaluationNextActionLabel,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import {
  buildEvaluationPathScheduleHref,
  isCaseBasedEvaluationPath,
  resolveProviderEvaluationEngagementFromSummaries,
} from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import {
  buildEvaluationPrepareHref,
  EVALUATION_PREPARE_LABEL,
  EVALUATION_RESUME_LABEL,
  EVALUATION_REVIEW_LABEL,
  resolveEvaluationLifecyclePhase,
} from "@/lib/surgical-sales/evaluationEngagementLifecycle";
import {
  buildEngagementActiveHref,
  buildEngagementDebriefHref,
} from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  hasEvaluationMarkedSuccessful,
  hasStructuredCommitmentSaved,
  isEvaluationReadyForCommitment,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";
import {
  MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_LABEL,
  MISSION_BOARD_CONFIRM_STRUCTURED_USE_LABEL,
  MISSION_BOARD_LOG_OUTCOME_UPDATE_LABEL,
  MISSION_BOARD_LOG_PRODUCT_USE_LABEL,
  MISSION_BOARD_MOVE_TO_OUTCOMES_LABEL,
} from "@/lib/surgical-sales/missionBoardCommitmentOutcomesService";



export type ProviderOverviewExecutionActionId =

  | "update_permission_status"

  | "schedule_intro_call"

  | "add_intelligence"

  | "add_observation_case"

  | "open_observation_case"

  | "launch_observation"

  | "create_follow_up"

  | "log_interaction"

  | "add_scheduler"

  | "add_support_contacts"

  | "add_credentialing_note"

  | "request_observation_permission"

  | "view_case_details"

  | "view_intelligence"

  | "schedule_provider_debrief"

  | "review_debrief"

  | "continue_debrief"

  | "advance_to_evaluation"

  | "choose_evaluation_path"

  | "schedule_evaluation"

  | "prepare_evaluation"

  | "resume_evaluation"

  | "review_evaluation"

  | "confirm_commitment"

  | "move_to_outcomes"

  | "log_outcome_update"

  | "log_product_use"

  | "intro_dictate_complete";



export type ProviderOverviewExecutionActionCustom =

  | "openObservationApproval"

  | "logFieldIntel"

  | "logInteraction"

  | "openScheduler"

  | "openSupportContacts"

  | "openCredentialingNote"

  | "openFollowUp"

  | "openEvaluationPath"

  | "openDebriefStatus"

  | "openCommitment"

  | "openOutcomeUpdate"

  | "openProductUse"

  | "editMissionSchedule"

  | "moveToOutcomes";



import type { MissionBoardCardActionId } from "@/lib/surgical-sales/deriveMissionBoardCardActions";

export type ProviderOverviewExecutionAction = {

  id: ProviderOverviewExecutionActionId;

  label: string;

  href?: string;

  customAction?: ProviderOverviewExecutionActionCustom;

  engagementId?: string;

  engagementStatus?: string;

  engagementType?: string;

  /** Mission Board shortcut identity — used for in-progress engagement quick actions. */
  missionBoardShortcutId?: MissionBoardCardActionId;

};



export type ProviderOverviewExecutionCtaPhase =

  | "permission_pending"

  | "permission_confirmed"

  | "observe"

  | "observation_scheduled"

  | "debrief"

  | "debrief_ready"

  | "evaluation"

  | "commitment"

  | "outcomes";



export type ProviderOverviewExecutionCtas = {

  phase: ProviderOverviewExecutionCtaPhase;

  primary: ProviderOverviewExecutionAction;

  /** Equal-weight co-primary on discovery providers before intro is scheduled. */
  secondary?: ProviderOverviewExecutionAction;

  quickActions: ProviderOverviewExecutionAction[];

  guidanceLine: string | null;

};



export function pickActiveObservationCase(
  cases?: Array<Record<string, unknown>>,
): Record<string, unknown> | null {
  return resolveScheduledObservationCases(cases)[0] ?? null;
}



function resolveObservationCaseHref(input: {

  providerId: string;

  contact: Record<string, unknown>;

  observationCaseHref?: string;

}): string {

  if (input.observationCaseHref?.trim()) return input.observationCaseHref.trim();

  const accountId = String(input.contact.account_id ?? input.contact.organization_id ?? "").trim();

  return buildProviderObservationCaseHref({ providerId: input.providerId, accountId });

}



function providerDebriefCompleted(engagements: PathwayGateEngagementRef[] | undefined): boolean {
  return (engagements ?? []).some((engagement) => {
    const type = normalizeEngagementType(String(engagement.engagement_type ?? ""));
    return type === "provider_debrief" && String(engagement.status ?? "").toLowerCase() === "completed";
  });
}

export function resolveProviderOverviewExecutionCtaPhase(

  input: PathwayGateInput,

): ProviderOverviewExecutionCtaPhase {

  const activeCase = pickActiveObservationCase(input.cases);
  const completedObservations = countObservedProcedures(input);

  if (
    completedObservations >= PROVIDER_OBSERVATION_TARGET &&
    !activeCase &&
    !providerDebriefCompleted(input.engagements)
  ) {
    return "debrief_ready";
  }

  const stage = resolveObservationPermissionStage(input);

  if (activeCase || stage === "observation_scheduled") {
    return "observation_scheduled";
  }

  if (
    observationPermissionConfirmedOnFile(input.contact ?? {}) ||
    stage === "permission_confirmed" ||
    stage === "observation_completed"
  ) {
    return "permission_confirmed";
  }

  return "permission_pending";

}



function buildPermissionPendingCtas(input: {

  providerId: string;

  intelligenceHref: string;

  newEngagementHref: string;

  contact: Record<string, unknown>;

  engagements?: ProviderEngagementSummary[];

  stageId?: SalesPathwayStageId | string;

}): ProviderOverviewExecutionCtas {

  const secondary = shouldSuggestScheduleIntroCallAction({
    contact: input.contact,
    engagements: input.engagements,
    stageId: input.stageId,
  })
    ? buildScheduleIntroCallAction(input.newEngagementHref)
    : undefined;

  return {

    phase: "permission_pending",

    primary: {

      id: "update_permission_status",

      label: "Update Permission Status",

      customAction: "openObservationApproval",

    },

    secondary,

    quickActions: [

      {

        id: "add_scheduler",

        label: "Add Scheduler",

        customAction: "openScheduler",

      },

      {

        id: "add_credentialing_note",

        label: "Add Credentialing Note",

        customAction: "openCredentialingNote",

      },

      {

        id: "request_observation_permission",

        label: "Request Observation Permission",

        customAction: "openObservationApproval",

      },

    ],

    guidanceLine: "Update permission when you learn something — no formal engagement required.",

  };

}



function buildPermissionConfirmedCtas(input: {

  providerId: string;

  contact: Record<string, unknown>;

  observationCaseHref: string;

}): ProviderOverviewExecutionCtas {

  return {

    phase: "permission_confirmed",

    primary: {

      id: "add_observation_case",

      label: "Add Observation Case",

      href: input.observationCaseHref,

    },

    quickActions: [

      {

        id: "add_scheduler",

        label: "Add Scheduler",

        customAction: "openScheduler",

      },

      {

        id: "add_credentialing_note",

        label: "Add Credentialing Note",

        customAction: "openCredentialingNote",

      },

    ],

    guidanceLine: "Permission is on file — add an observation case to plan the OR day.",

  };

}



function buildObservationScheduledCtas(input: {
  providerId: string;
  contact: Record<string, unknown>;
  cases?: Array<Record<string, unknown>>;
  observationCaseHref: string;
}): ProviderOverviewExecutionCtas {
  const facilityLabel =
    String(input.contact.primary_organization_name ?? input.contact.organization_name ?? "").trim() ||
    "No organization";
  const rollup = buildProviderObservationCaseRollup({
    cases: input.cases,
    facilityLabel,
  });
  const nextCase = rollup.nextScheduled;
  const primaryHref =
    rollup.upcomingCount > 0
      ? observationQueuePrimaryHref({ providerId: input.providerId, rollup })
      : input.observationCaseHref;
  const primaryLabel = observationQueuePrimaryLabel(rollup.upcomingCount);

  const quickActions: ProviderOverviewExecutionAction[] = [];

  if (rollup.upcomingCount > 1) {
    quickActions.push({
      id: "view_case_details",
      label: `View Observation Queue (${rollup.upcomingCount})`,
      href: primaryHref,
    });
  } else if (nextCase?.caseId) {
    quickActions.push({
      id: "view_case_details",
      label: "View Case Details",
      href: buildProviderObservationCaseWorkflowHref(nextCase.caseId),
    });
  }

  quickActions.push(
    {
      id: "add_observation_case",
      label: rollup.upcomingCount > 0 ? "Add Another Observation Case" : "Add Observation Case",
      href: input.observationCaseHref,
    },
  );

  return {
    phase: "observation_scheduled",
    primary: {
      id: nextCase?.caseId ? "open_observation_case" : "add_observation_case",
      label: primaryLabel,
      href: primaryHref,
    },
    quickActions,
    guidanceLine:
      rollup.upcomingCount > 0
        ? `${rollup.upcomingCount} observation case${rollup.upcomingCount === 1 ? "" : "s"} scheduled — open the next case when ready.`
        : "Add an observation case to schedule and capture field intelligence.",
  };
}



function resolveDebriefStagePrimaryActionId(phase: DebriefLifecyclePhase): ProviderOverviewExecutionActionId {
  switch (phase) {
    case "complete":
      return "review_debrief";
    case "complete_debrief":
      return "continue_debrief";
    default:
      return "schedule_provider_debrief";
  }
}

function buildDebriefStageCtas(input: {
  contact: Record<string, unknown>;
  providerId: string;
  newEngagementHref: string;
  observationCaseHref: string;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewExecutionCtas {
  const gateInput: PathwayGateInput = {
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
  };
  const debrief = resolveProviderDebriefEngagementFromSummaries(input.engagements);
  const lifecycle = deriveDebriefLifecyclePrimaryAction(debrief);
  const productFitValidated = hasProductFitValidated(gateInput);

  if (providerDebriefNotesComplete(debrief) && !productFitValidated) {
    return {
      phase: "debrief",
      primary: {
        id: "advance_to_evaluation",
        label: "Advance to Evaluation",
        customAction: "openDebriefStatus",
      },
      quickActions: lifecycle.href
        ? [
            {
              id: "review_debrief",
              label: MISSION_BOARD_DEBRIEF_REVIEW_LABEL,
              href: lifecycle.href,
            },
          ]
        : [],
      guidanceLine: "Debrief complete — advance to Evaluation to continue the sales pathway.",
    };
  }

  const primaryHref =
    lifecycle.href || buildProviderEngagementTypeHref(input.newEngagementHref, "provider_debrief");

  return {
    phase: "debrief",
    primary: {
      id: resolveDebriefStagePrimaryActionId(lifecycle.phase),
      label: lifecycle.label,
      href: primaryHref,
    },
    quickActions: [],
    guidanceLine:
      lifecycle.phase === "not_scheduled"
        ? "Schedule provider debrief to validate observed workflow and product opportunities."
        : debriefLifecycleStatusLine(lifecycle.phase),
  };
}

function buildObserveStageCtas(input: {
  providerId: string;
  contact: Record<string, unknown>;
  observationCaseHref: string;
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewExecutionCtas {
  const activeCase = pickActiveObservationCase(input.cases);
  if (activeCase) {
    return buildObservationScheduledCtas({
      providerId: input.providerId,
      contact: input.contact,
      cases: input.cases,
      observationCaseHref: input.observationCaseHref,
    });
  }

  return {
    phase: "observe",
    primary: {
      id: "add_observation_case",
      label: "Add Observation",
      href: input.observationCaseHref,
    },
    quickActions: [
      {
        id: "add_scheduler",
        label: "Add Scheduler",
        customAction: "openScheduler",
      },
      {
        id: "add_credentialing_note",
        label: "Add Credentialing Note",
        customAction: "openCredentialingNote",
      },
    ],
    guidanceLine: "Permission is on file — add observation cases to build the observation series.",
  };
}

function buildDebriefReadyCtas(input: {
  newEngagementHref: string;
  engagements?: ProviderEngagementSummary[];
}): ProviderOverviewExecutionCtas {
  const debriefHref = buildProviderEngagementTypeHref(input.newEngagementHref, "provider_debrief");
  const existingDebrief = resolveProviderDebriefEngagementFromSummaries(input.engagements);
  const primaryLabel = deriveMissionBoardDebriefCardLabel(existingDebrief);

  return {
    phase: "debrief_ready",
    primary: {
      id: "schedule_provider_debrief",
      label: primaryLabel || MISSION_BOARD_DEBRIEF_CREATE_LABEL,
      href: debriefHref,
    },
    quickActions: [],
    guidanceLine: "Schedule provider debrief to validate observed workflow and product opportunities.",
  };
}



/** Evaluation stage — same status/lifecycle source as the Mission Board card. */
function buildEvaluationStageCtas(input: {
  contact: Record<string, unknown>;
  providerId: string;
  newEngagementHref: string;
  observationCaseHref: string;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewExecutionCtas {
  const { contact } = input;
  const evaluationPreview = resolveProviderEvaluationEngagementFromSummaries(input.engagements);
  const lifecyclePhase = resolveEvaluationLifecyclePhase(evaluationPreview);

  const changePathAction: ProviderOverviewExecutionAction = {
    id: "choose_evaluation_path",
    label: "Change Evaluation Path",
    customAction: "openEvaluationPath",
  };

  const evaluationComplete =
    hasEvaluationMarkedSuccessful(contact) ||
    lifecyclePhase === "complete" ||
    isEvaluationReadyForCommitment(contact, {
      engagements: input.engagements,
      cases: input.cases,
    });

  if (evaluationComplete) {
    const quickActions: ProviderOverviewExecutionAction[] = [];
    if (evaluationPreview) {
      quickActions.push({
        id: "review_evaluation",
        label: EVALUATION_REVIEW_LABEL,
        href: buildEngagementDebriefHref(evaluationPreview.id, true),
      });
    }
    return {
      phase: "evaluation",
      primary: {
        id: "confirm_commitment",
        label: MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_LABEL,
        customAction: "openCommitment",
      },
      quickActions,
      guidanceLine: "Evaluation complete — confirm the provider commitment to advance.",
    };
  }

  if (!hasProviderSelectedEvaluationPath(contact)) {
    return {
      phase: "evaluation",
      primary: {
        id: "choose_evaluation_path",
        label: MISSION_BOARD_CHOOSE_EVALUATION_PATH_LABEL,
        customAction: "openEvaluationPath",
      },
      quickActions: [],
      guidanceLine: "Pick the evaluation path that fits the validated opportunity.",
    };
  }

  const path = deriveProviderEvaluationPath({ contact });

  if (isCaseBasedEvaluationPath(path)) {
    const scheduleLabel = resolveEvaluationNextActionLabel({
      pathLabel: path,
      engagements: input.engagements,
    });
    const scheduleHref = buildEvaluationPathScheduleHref({
      path,
      providerId: input.providerId,
      accountId: String(contact.account_id ?? contact.organization_id ?? contact.primary_organization_id ?? ""),
      newEngagementHref: input.newEngagementHref,
    });

    return {
      phase: "evaluation",
      primary: {
        id: "schedule_evaluation",
        label: scheduleLabel,
        href: scheduleHref,
      },
      quickActions: [changePathAction],
      guidanceLine:
        path === "Product Trial"
          ? "Schedule a product trial case — evaluation happens in the OR, not as a separate engagement."
          : `Evaluation path selected: ${path} — schedule the next case.`,
    };
  }

  if (evaluationPreview && (lifecyclePhase === "scheduled" || lifecyclePhase === "prepared")) {
    return {
      phase: "evaluation",
      primary: {
        id: "prepare_evaluation",
        label: EVALUATION_PREPARE_LABEL,
        href: buildEvaluationPrepareHref(evaluationPreview.id),
      },
      quickActions: [changePathAction],
      guidanceLine: "Evaluation is scheduled — prepare, then start it from the briefing.",
    };
  }

  if (evaluationPreview && lifecyclePhase === "active") {
    return {
      phase: "evaluation",
      primary: {
        id: "resume_evaluation",
        label: EVALUATION_RESUME_LABEL,
        href: buildEngagementActiveHref(evaluationPreview.id),
      },
      quickActions: [changePathAction],
      guidanceLine: "Evaluation in progress — resume and complete it.",
    };
  }

  const scheduleLabel = resolveEvaluationNextActionLabel({
    pathLabel: path,
    engagements: input.engagements,
  });
  const scheduleHref = buildEvaluationPathScheduleHref({
    path,
    providerId: input.providerId,
    accountId: String(contact.account_id ?? contact.organization_id ?? contact.primary_organization_id ?? ""),
    newEngagementHref: input.newEngagementHref,
  });

  return {
    phase: "evaluation",
    primary: {
      id: "schedule_evaluation",
      label: scheduleLabel,
      href: scheduleHref,
    },
    quickActions: [changePathAction],
    guidanceLine: `Evaluation path selected: ${path} — schedule the evaluation activity.`,
  };
}

/** Commitment stage — confirm structured use, then move to outcomes. */
function buildCommitmentStageCtas(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
}): ProviderOverviewExecutionCtas {
  const evaluationPreview = resolveProviderEvaluationEngagementFromSummaries(input.engagements);
  const quickActions: ProviderOverviewExecutionAction[] = [];
  if (evaluationPreview) {
    quickActions.push({
      id: "review_evaluation",
      label: EVALUATION_REVIEW_LABEL,
      href: buildEngagementDebriefHref(evaluationPreview.id, true),
    });
  }

  if (!hasStructuredCommitmentSaved(input.contact)) {
    return {
      phase: "commitment",
      primary: {
        id: "confirm_commitment",
        label: MISSION_BOARD_CONFIRM_STRUCTURED_USE_LABEL,
        customAction: "openCommitment",
      },
      quickActions,
      guidanceLine: "Capture the structured-use agreement: product, use pattern, and start date.",
    };
  }

  return {
    phase: "commitment",
    primary: {
      id: "move_to_outcomes",
      label: MISSION_BOARD_MOVE_TO_OUTCOMES_LABEL,
      customAction: "moveToOutcomes",
    },
    quickActions,
    guidanceLine: "Commitment confirmed — start outcomes tracking.",
  };
}

/** Outcomes stage — lightweight product use + outcome logging. */
function buildOutcomesStageCtas(): ProviderOverviewExecutionCtas {
  return {
    phase: "outcomes",
    primary: {
      id: "log_outcome_update",
      label: MISSION_BOARD_LOG_OUTCOME_UPDATE_LABEL,
      customAction: "openOutcomeUpdate",
    },
    quickActions: [
      {
        id: "log_product_use",
        label: MISSION_BOARD_LOG_PRODUCT_USE_LABEL,
        customAction: "openProductUse",
      },
    ],
    guidanceLine: "Track utilization, outcomes, QTi, feedback, and barriers as they happen.",
  };
}

export function buildScheduleIntroCallAction(newEngagementHref: string): ProviderOverviewExecutionAction {
  return {
    id: "schedule_intro_call",
    label: PROVIDER_FIELD_OPS_CTA.scheduleIntroCall,
    href: buildProviderEngagementTypeHref(newEngagementHref, "intro_call"),
  };
}

export function shouldSuggestScheduleIntroCallAction(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  stageId?: SalesPathwayStageId | string;
}): boolean {
  const stageId = normalizeSalesPathwayStageId(String(input.stageId ?? "discovery")) ?? "discovery";
  if (stageId !== "discovery") return false;
  if (
    !isRelationshipFirstDiscovery({
      contact: input.contact,
      engagements: input.engagements,
    })
  ) {
    return false;
  }
  return !hasUpcomingIntroEngagement(input.engagements);
}

/** @deprecated Use shouldSuggestScheduleIntroCallAction */
export const shouldSuggestScheduleIntroCallQuickAction = shouldSuggestScheduleIntroCallAction;



export function buildProviderOverviewExecutionCtas(input: {

  contact: Record<string, unknown>;

  providerId: string;

  newEngagementHref: string;

  noteHref: string;

  intelligenceHref: string;

  observationCaseHref?: string;

  engagements?: import("@/lib/surgical-sales/engagements/providerEngagementSummary").ProviderEngagementSummary[];

  cases?: Array<Record<string, unknown>>;

  stageId?: SalesPathwayStageId | string;

}): ProviderOverviewExecutionCtas {

  const gateInput: PathwayGateInput = {

    contact: input.contact,

    engagements: input.engagements,

    cases: input.cases,

  };

  const observationCaseHref = resolveObservationCaseHref(input);

  // Post-debrief stages are gate-derived from stageId — same logic as the Mission Board.
  const normalizedStage = normalizeSalesPathwayStageId(String(input.stageId ?? ""));
  if (normalizedStage === "evaluation") {
    return buildEvaluationStageCtas({
      contact: input.contact,
      providerId: input.providerId,
      newEngagementHref: input.newEngagementHref,
      observationCaseHref,
      engagements: input.engagements,
      cases: input.cases,
    });
  }
  if (normalizedStage === "commitment") {
    return buildCommitmentStageCtas({
      contact: input.contact,
      engagements: input.engagements,
    });
  }
  if (normalizedStage === "outcomes") {
    return buildOutcomesStageCtas();
  }
  if (normalizedStage === "debrief") {
    return buildDebriefStageCtas({
      contact: input.contact,
      providerId: input.providerId,
      newEngagementHref: input.newEngagementHref,
      observationCaseHref,
      engagements: input.engagements,
      cases: input.cases,
    });
  }
  if (normalizedStage === "observe") {
    return buildObserveStageCtas({
      providerId: input.providerId,
      contact: input.contact,
      observationCaseHref,
      cases: input.cases,
    });
  }

  const phase = resolveProviderOverviewExecutionCtaPhase(gateInput);



  switch (phase) {

    case "debrief_ready":
      return buildDebriefReadyCtas({
        newEngagementHref: input.newEngagementHref,
        engagements: input.engagements,
      });

    case "observation_scheduled":

      return buildObservationScheduledCtas({

        providerId: input.providerId,

        contact: input.contact,

        cases: input.cases,

        observationCaseHref,

      });

    case "permission_confirmed":

      return buildPermissionConfirmedCtas({

        providerId: input.providerId,

        contact: input.contact,

        observationCaseHref,

      });

    default:

      return buildPermissionPendingCtas({

        providerId: input.providerId,

        intelligenceHref: input.intelligenceHref,

        newEngagementHref: input.newEngagementHref,

        contact: input.contact,

        engagements: input.engagements,

        stageId: input.stageId,

      });

  }

}


