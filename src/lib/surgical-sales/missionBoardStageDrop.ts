/**
 * Mission Board drag-and-drop — guided forward progression only.
 */

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import {
  countObservedProcedures,
  hasStructuredCommitmentSaved,
  isCommitmentStageComplete,
  isDiscoveryReadyForObserve,
  isEvaluationStageComplete,
  isObserveStageComplete,
  type PathwayGateEngagementRef,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";
import { nextSalesPathwayStage, SALES_PATHWAY_OFFICIAL_STAGE_ORDER } from "@/lib/surgical-sales/pathway/salesPathwayRules";
import {
  SALES_PATHWAY_MIN_OBSERVATIONS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import { deriveProviderMissionBoardColumn } from "@/lib/surgical-sales/providerMissionBoard";

export type MissionBoardDropTargetState = "neutral" | "valid" | "invalid";

export type MissionBoardDropTargetPreview = {
  state: MissionBoardDropTargetState;
  hint: string | null;
};

export type MissionBoardDropBlockerAction = {
  id:
    | "cancel"
    | "add_observation"
    | "create_debrief"
    | "debrief_status"
    | "create_evaluation"
    | "log_commitment"
    | "observation_status";
  label: string;
};

export type MissionBoardDropResolution =
  | { type: "noop" }
  | { type: "open_observation_approval" }
  | { type: "open_debrief_status" }
  | { type: "open_commitment_modal" }
  | { type: "activate_outcomes_tracking"; message?: string }
  | { type: "mark_evaluation_successful"; message?: string }
  | { type: "refresh"; message?: string }
  | {
      type: "blocked";
      message: string;
      actions: MissionBoardDropBlockerAction[];
    };

function stageIndex(stageId: SalesPathwayStageId): number {
  return SALES_PATHWAY_OFFICIAL_STAGE_ORDER.indexOf(stageId);
}

export function providerPathwayGateInput(provider: ProviderDirectoryRow): PathwayGateInput {
  return buildMissionBoardPathwayGateInput(provider);
}

type MissionBoardGateEngagement = PathwayGateEngagementRef & {
  debrief_completed?: boolean;
};

/** Directory row → gate input with debrief + observation context for client-side drop preview. */
export function buildMissionBoardPathwayGateInput(provider: ProviderDirectoryRow): PathwayGateInput {
  const engagements: MissionBoardGateEngagement[] = [];

  const debrief = provider.provider_debrief_engagement;
  if (debrief?.id) {
    engagements.push({
      id: String(debrief.id),
      engagement_type: "provider_debrief",
      status: String(debrief.status ?? "planned"),
      debrief_completed: Boolean(debrief.debrief_completed),
    });
  }

  const upcoming = provider.upcoming_engagement;
  if (
    upcoming?.id &&
    isProviderDebriefEngagement(String(upcoming.engagement_type ?? "")) &&
    !engagements.some((row) => row.id === upcoming.id)
  ) {
    engagements.push({
      id: String(upcoming.id),
      engagement_type: String(upcoming.engagement_type ?? "provider_debrief"),
      status: String(upcoming.status ?? "planned"),
      debrief_completed: Boolean(upcoming.debrief_completed),
    });
  }

  return {
    contact: provider as Record<string, unknown>,
    engagements,
  };
}

/** Mission Board drag — require tactical debrief saved (matches Status modal + card completion). */
export function isMissionBoardDebriefReadyForEvaluation(input: PathwayGateInput): boolean {
  return (input.engagements ?? []).some((engagement) => {
    const type = String(engagement.engagement_type || "").toLowerCase();
    if (!isProviderDebriefEngagement(type) && !type.includes("debrief")) return false;
    return Boolean((engagement as MissionBoardGateEngagement).debrief_completed);
  });
}

export function resolveProviderCurrentMissionStage(provider: ProviderDirectoryRow): SalesPathwayStageId {
  return deriveProviderMissionBoardColumn(provider) ?? "discovery";
}

export function isMissionBoardForwardAdjacentDrop(
  fromStage: SalesPathwayStageId,
  toStage: SalesPathwayStageId,
): boolean {
  const next = nextSalesPathwayStage(fromStage);
  return Boolean(next && next === toStage);
}

export const MISSION_BOARD_DROP_MESSAGES = {
  observationApprovalNotConfirmed: "Observation approval required before entering Observation stage.",
  observationShortfall: (count: number) =>
    `Only ${count} of ${SALES_PATHWAY_MIN_OBSERVATIONS} observations completed.`,
  debriefNotCompleted: "Complete provider debrief before moving to Evaluation.",
  evaluationIncomplete: "Complete evaluation before moving to Commitment.",
  commitmentIncomplete: "Document commitment before moving to Outcomes.",
  forwardOnly: "Pathway stages advance forward only.",
  skipAhead: "Complete the next stage before skipping ahead.",
} as const;

function observationShortfallMessage(input: PathwayGateInput): string {
  return MISSION_BOARD_DROP_MESSAGES.observationShortfall(countObservedProcedures(input));
}

/** Drag-over highlight + inline hint while dragging. */
export function missionBoardDropTargetPreview(
  fromStage: SalesPathwayStageId,
  toStage: SalesPathwayStageId,
  provider: ProviderDirectoryRow,
): MissionBoardDropTargetPreview {
  if (fromStage === toStage) {
    return { state: "neutral", hint: null };
  }

  if (!isMissionBoardForwardAdjacentDrop(fromStage, toStage)) {
    if (stageIndex(toStage) < stageIndex(fromStage)) {
      return { state: "invalid", hint: MISSION_BOARD_DROP_MESSAGES.forwardOnly };
    }
    return { state: "invalid", hint: MISSION_BOARD_DROP_MESSAGES.skipAhead };
  }

  const gateInput = buildMissionBoardPathwayGateInput(provider);

  if (fromStage === "discovery" && toStage === "observe") {
    if (isDiscoveryReadyForObserve(gateInput)) {
      return { state: "valid", hint: "Release to move to Observation." };
    }
    return {
      state: "valid",
      hint: "Release to confirm observation permission.",
    };
  }

  if (fromStage === "observe" && toStage === "debrief") {
    if (isObserveStageComplete(gateInput)) {
      return { state: "valid", hint: "Release to move to Debrief." };
    }
    return {
      state: "invalid",
      hint: observationShortfallMessage(gateInput),
    };
  }

  if (fromStage === "debrief" && toStage === "evaluation") {
    if (isMissionBoardDebriefReadyForEvaluation(gateInput)) {
      return { state: "valid", hint: "Release to move to Evaluation." };
    }
    return {
      state: "valid",
      hint: "Release to update debrief status.",
    };
  }

  if (fromStage === "evaluation" && toStage === "commitment") {
    if (isEvaluationStageComplete(gateInput)) {
      return { state: "valid", hint: "Release to move to Commitment." };
    }
    return {
      state: "valid",
      hint: "Release to mark evaluation successful and move to Commitment.",
    };
  }

  if (fromStage === "commitment" && toStage === "outcomes") {
    if (!hasStructuredCommitmentSaved(gateInput)) {
      return { state: "valid", hint: "Release to confirm structured use." };
    }
    return { state: "valid", hint: "Release to move to Outcomes." };
  }

  return { state: "neutral", hint: null };
}

/** @deprecated Use missionBoardDropTargetPreview().state */
export function missionBoardDropTargetState(
  fromStage: SalesPathwayStageId,
  toStage: SalesPathwayStageId,
  provider: ProviderDirectoryRow,
): MissionBoardDropTargetState {
  return missionBoardDropTargetPreview(fromStage, toStage, provider).state;
}

/** Drop resolution — client preview; server route enriches with engagements/cases when needed. */
export function resolveMissionBoardStageDrop(
  fromStage: SalesPathwayStageId,
  toStage: SalesPathwayStageId,
  gateInput: PathwayGateInput,
): MissionBoardDropResolution {
  if (fromStage === toStage) return { type: "noop" };

  if (!isMissionBoardForwardAdjacentDrop(fromStage, toStage)) {
    if (stageIndex(toStage) < stageIndex(fromStage)) {
      return {
        type: "blocked",
        message: MISSION_BOARD_DROP_MESSAGES.forwardOnly,
        actions: [{ id: "cancel", label: "Cancel" }],
      };
    }
    return {
      type: "blocked",
      message: MISSION_BOARD_DROP_MESSAGES.skipAhead,
      actions: [{ id: "cancel", label: "Cancel" }],
    };
  }

  if (fromStage === "discovery" && toStage === "observe") {
    if (isDiscoveryReadyForObserve(gateInput)) {
      return { type: "refresh", message: "Observation access confirmed — provider moves to Observation." };
    }
    return { type: "open_observation_approval" };
  }

  if (fromStage === "observe" && toStage === "debrief") {
    if (!isObserveStageComplete(gateInput)) {
      return {
        type: "blocked",
        message: observationShortfallMessage(gateInput),
        actions: [
          { id: "add_observation", label: "Add Observation" },
          { id: "cancel", label: "Cancel" },
        ],
      };
    }
    return { type: "refresh", message: "Observation program complete — provider moves to Debrief." };
  }

  if (fromStage === "debrief" && toStage === "evaluation") {
    if (!isMissionBoardDebriefReadyForEvaluation(gateInput)) {
      return { type: "open_debrief_status" };
    }
    return { type: "refresh", message: "Debrief complete — provider moves to Evaluation." };
  }

  if (fromStage === "evaluation" && toStage === "commitment") {
    if (isEvaluationStageComplete(gateInput)) {
      return { type: "refresh", message: "Evaluation complete — provider moves to Commitment." };
    }
    return {
      type: "mark_evaluation_successful",
      message: "Evaluation marked successful — provider moves to Commitment.",
    };
  }

  if (fromStage === "commitment" && toStage === "outcomes") {
    if (!hasStructuredCommitmentSaved(gateInput)) {
      return { type: "open_commitment_modal" };
    }
    if (!isCommitmentStageComplete(gateInput)) {
      return {
        type: "activate_outcomes_tracking",
        message: "Provider moved to Outcomes",
      };
    }
    return { type: "refresh", message: "Commitment documented — provider moves to Outcomes." };
  }

  return { type: "noop" };
}

export function missionBoardDropNeedsServerValidation(
  fromStage: SalesPathwayStageId,
  toStage: SalesPathwayStageId,
): boolean {
  if (!isMissionBoardForwardAdjacentDrop(fromStage, toStage)) return false;
  return (
    fromStage === "observe" ||
    fromStage === "debrief" ||
    fromStage === "evaluation" ||
    fromStage === "commitment"
  );
}

export function observationApprovalRequiredMessage(): string {
  return MISSION_BOARD_DROP_MESSAGES.observationApprovalNotConfirmed;
}
