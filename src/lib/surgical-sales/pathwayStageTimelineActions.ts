import {
  SALES_PATHWAY_MIN_COMMITTED_CASES,
  SALES_PATHWAY_MIN_OBSERVATIONS,
  SALES_PATHWAY_STAGE_IDS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import { providerOverviewPathwayDisplayLabel } from "@/lib/surgical-sales/providerOverviewPathwayDisplayLabels";
import {
  countCommittedProductCases,
  countObservedProcedures,
  isCommitmentStageComplete,
  isDebriefStageComplete,
  isDiscoveryReadyForObserve,
  isEvaluationStageComplete,
  isObserveStageComplete,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";
import { nextSalesPathwayStage } from "@/lib/surgical-sales/pathway/salesPathwayRules";

export type PathwayTimelineStepStatus = "complete" | "current" | "upcoming";

export type PathwayStageClickAction =
  | { type: "none" }
  | { type: "open_observation_approval"; preferScheduleObservation: boolean }
  | { type: "open_debrief_status" }
  | { type: "show_unlock_hint"; title: string; message: string };

function stageExitGateMet(stageId: SalesPathwayStageId, input: PathwayGateInput): boolean {
  switch (stageId) {
    case "discovery":
      return isDiscoveryReadyForObserve(input);
    case "observe":
      return isObserveStageComplete(input);
    case "debrief":
      return isDebriefStageComplete(input);
    case "evaluation":
      return isEvaluationStageComplete(input);
    case "commitment":
      return isCommitmentStageComplete(input);
    case "outcomes":
      return true;
    default:
      return false;
  }
}

export function buildPathwayStageExitRequirementMessage(
  stageId: SalesPathwayStageId,
  input: PathwayGateInput,
): string {
  const nextStage = nextSalesPathwayStage(stageId);
  const nextLabel = nextStage ? providerOverviewPathwayDisplayLabel(nextStage) : "the next stage";

  switch (stageId) {
    case "discovery":
      return `${nextLabel} requires observation permission confirmed.`;
    case "observe": {
      const count = countObservedProcedures(input);
      return `${nextLabel} requires ${SALES_PATHWAY_MIN_OBSERVATIONS} completed observations (${count} of ${SALES_PATHWAY_MIN_OBSERVATIONS} complete), or a rep mark that the sequence is complete.`;
    }
    case "debrief":
      return `${nextLabel} requires a completed provider debrief and validated product fit — interest and follow-up needed do not advance.`;
    case "evaluation":
      return `${nextLabel} requires a completed evaluation activity (trial, 360 experience, in-service, education, or additional observation).`;
    case "commitment": {
      const count = countCommittedProductCases(input);
      return `${nextLabel} requires ${SALES_PATHWAY_MIN_COMMITTED_CASES} committed product cases (${count} of ${SALES_PATHWAY_MIN_COMMITTED_CASES} complete).`;
    }
    default:
      return `Complete the current stage to unlock ${nextLabel}.`;
  }
}

export function resolveFirstBlockingPathwayStage(
  targetStageId: SalesPathwayStageId,
  input: PathwayGateInput,
): SalesPathwayStageId | null {
  const targetIndex = SALES_PATHWAY_STAGE_IDS.indexOf(targetStageId);

  for (let i = 0; i < targetIndex; i++) {
    const stageId = SALES_PATHWAY_STAGE_IDS[i];
    if (!stageExitGateMet(stageId, input)) {
      return stageId;
    }
  }

  return null;
}

export function buildPathwayStageUnlockHint(
  targetStageId: SalesPathwayStageId,
  input: PathwayGateInput,
): { title: string; message: string } {
  const targetLabel = providerOverviewPathwayDisplayLabel(targetStageId);
  const blocker = resolveFirstBlockingPathwayStage(targetStageId, input);

  if (blocker) {
    return {
      title: `Unlock ${targetLabel}`,
      message: buildPathwayStageExitRequirementMessage(blocker, input),
    };
  }

  return {
    title: targetLabel,
    message: "This stage opens when you complete the current pathway work.",
  };
}

export function resolvePathwayStageClick(input: {
  activeStageId: SalesPathwayStageId;
  clickedStageId: SalesPathwayStageId;
  clickedStepStatus: PathwayTimelineStepStatus;
  gateInput: PathwayGateInput;
}): PathwayStageClickAction {
  const { clickedStageId, clickedStepStatus, gateInput } = input;

  if (clickedStepStatus === "complete" || clickedStepStatus === "current") {
    return { type: "none" };
  }

  const blocker = resolveFirstBlockingPathwayStage(clickedStageId, gateInput);

  if (blocker === "discovery") {
    return {
      type: "open_observation_approval",
      preferScheduleObservation: clickedStageId === "observe",
    };
  }

  if (blocker === "debrief") {
    return { type: "open_debrief_status" };
  }

  const hint = buildPathwayStageUnlockHint(clickedStageId, gateInput);
  return { type: "show_unlock_hint", title: hint.title, message: hint.message };
}

export function pathwayStageStepIsActionable(input: {
  clickedStepStatus: PathwayTimelineStepStatus;
}): boolean {
  return input.clickedStepStatus === "upcoming";
}
