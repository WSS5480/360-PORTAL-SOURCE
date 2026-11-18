/**
 * Four progression lanes — operational maturity, deployment, observation, commercialization.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderIntelligenceMaturitySnapshot,
  type ProviderIntelligenceMaturityContext,
  type ProviderIntelligenceMaturitySnapshot,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import { buildProviderObservationFeasibilitySummary } from "@/lib/surgical-sales/buildProviderObservationFeasibilitySummary";
import {
  deriveIntelligenceSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  COMMERCIALIZATION_PROGRESSION_STEPS,
  OBSERVATION_READINESS_EVOLUTION_STEPS,
  OPERATIONAL_MATURITY_EVOLUTION_STEPS,
  PROGRESSION_LANE_LABELS,
  type IntelligenceProgressionLaneId,
} from "@/lib/surgical-sales/providerIntelligenceProgressionVocabulary";
import {
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { PROVIDER_OVERVIEW_MATURITY_LABELS } from "@/lib/surgical-sales/providerOverviewVocabulary";

export type ProgressionLaneStepStatus = "complete" | "current" | "upcoming";

export type ProgressionLaneStep = {
  id: string;
  label: string;
  status: ProgressionLaneStepStatus;
};

export type IntelligenceProgressionLane = {
  id: IntelligenceProgressionLaneId;
  label: string;
  currentLabel: string;
  nextLabel: string | null;
  progressPercent: number;
  evolutionScan: string;
  steps: ProgressionLaneStep[];
};

const CONFIDENCE_RANK: Record<IntelligenceSectionConfidence, number> = {
  unknown: 0,
  partial: 1,
  confirmed: 2,
  validated: 3,
};

function buildStepStatuses(
  currentIndex: number,
  stepCount: number,
): ProgressionLaneStepStatus[] {
  return Array.from({ length: stepCount }, (_, i) => {
    if (i < currentIndex) return "complete";
    if (i === currentIndex) return "current";
    return "upcoming";
  });
}

function laneFromSteps(
  id: IntelligenceProgressionLaneId,
  steps: readonly { id: string; label: string }[],
  currentIndex: number,
  evolutionScan: string,
  nextLabel: string | null,
): IntelligenceProgressionLane {
  const clamped = Math.max(0, Math.min(currentIndex, steps.length - 1));
  const statuses = buildStepStatuses(clamped, steps.length);
  const progressPercent =
    steps.length <= 1 ? 100 : Math.round((clamped / (steps.length - 1)) * 100);

  return {
    id,
    label: PROGRESSION_LANE_LABELS[id],
    currentLabel: steps[clamped]!.label,
    nextLabel,
    progressPercent,
    evolutionScan: scanLine(evolutionScan, 96),
    steps: steps.map((step, i) => ({
      id: step.id,
      label: step.label,
      status: statuses[i]!,
    })),
  };
}

function buildOperationalMaturityLane(
  maturity: ProviderIntelligenceMaturitySnapshot,
): IntelligenceProgressionLane {
  const steps = OPERATIONAL_MATURITY_EVOLUTION_STEPS;
  const currentIndex = Math.min(maturity.stageIndex, steps.length - 1);
  const scan = maturity.nextStageLabel
    ? `${maturity.progressToNextPercent}% toward ${PROVIDER_OVERVIEW_MATURITY_LABELS[maturity.nextStage!] ?? maturity.nextStageLabel} — ${maturity.evolutionLine}`
    : maturity.evolutionLine;

  return laneFromSteps(
    "operational_maturity",
    steps,
    currentIndex,
    scan,
    maturity.nextStageLabel
      ? PROVIDER_OVERVIEW_MATURITY_LABELS[maturity.nextStage!] ?? maturity.nextStageLabel
      : null,
  );
}

function observationReadinessIndex(
  contact: Record<string, unknown>,
  planning: ProviderPlanningCompletion | null | undefined,
  commercialStage: ProviderCommercialWorkflowStage,
): number {
  const obsConfidence = deriveIntelligenceSectionConfidence(
    "observation_readiness",
    contact,
  ).confidence;
  const summary = buildProviderObservationFeasibilitySummary({
    contact,
    commercialStage,
  });

  if (obsConfidence === "validated" && summary.verdictId === "likely_feasible") {
    return 3;
  }
  if (obsConfidence === "validated" || obsConfidence === "confirmed") {
    return 2;
  }
  if (obsConfidence === "partial" || summary.verdictId === "feasible_with_restrictions") {
    return 1;
  }
  return 0;
}

function buildObservationReadinessLane(
  contact: Record<string, unknown>,
  planning: ProviderPlanningCompletion | null | undefined,
  commercialStage: ProviderCommercialWorkflowStage,
): IntelligenceProgressionLane {
  const steps = OBSERVATION_READINESS_EVOLUTION_STEPS;
  const idx = observationReadinessIndex(contact, planning, commercialStage);
  const obsConfidence = deriveIntelligenceSectionConfidence(
    "observation_readiness",
    contact,
  ).confidence;
  const next =
    idx < steps.length - 1 ? steps[idx + 1]!.label : null;
  const scan =
    idx >= 2
      ? "Observation path validated — confirm posting rhythm before high-stakes OR days."
      : idx === 1
        ? "Access signals emerging — firm up coordinator and allowance before travel."
        : "Map observation feasibility and OR access before allocating field time.";

  return laneFromSteps("observation_readiness", steps, idx, scan, next);
}

function commercializationIndex(stage: ProviderCommercialWorkflowStage): number {
  switch (stage) {
    case "early_discovery":
      return 0;
    case "observation":
      return 1;
    case "evaluation":
      return 2;
    case "adoption":
      return 3;
    default:
      return 0;
  }
}

function buildCommercializationLane(
  commercialStage: ProviderCommercialWorkflowStage,
  commercialConfidence: IntelligenceSectionConfidence,
): IntelligenceProgressionLane {
  const steps = COMMERCIALIZATION_PROGRESSION_STEPS;
  let idx = commercializationIndex(commercialStage);
  if (commercialStage === "evaluation" && CONFIDENCE_RANK[commercialConfidence] >= 2) {
    idx = Math.max(idx, 2);
  }
  if (commercialStage === "adoption") {
    idx = 3;
  }

  const next = idx < steps.length - 1 ? steps[idx + 1]!.label : null;
  const scan =
    idx >= 3
      ? "Commercialization-ready motion — preference-card and champion proof on file."
      : idx === 2
        ? "Evaluation-ready — tighten product fit and decision path before heavy field time."
        : idx === 1
          ? "Observation motion live — validate workflow while access stays warm."
          : "Early discovery — qualify procedural fit before OR travel.";

  return laneFromSteps("commercialization", steps, idx, scan, next);
}

function buildDeploymentProgressionLane(
  deploymentPhaseIndex: number,
  deploymentPhaseLabels: readonly string[],
  momentumPercent: number,
  nextPhaseLabel: string | null,
  blockedScan: string | null,
): IntelligenceProgressionLane {
  const steps = deploymentPhaseLabels.map((label, i) => ({
    id: `phase_${i}`,
    label,
  }));
  const scan = blockedScan
    ? blockedScan
    : nextPhaseLabel
      ? `${momentumPercent}% through current gate — next: ${nextPhaseLabel}`
      : "Full deployment progression on file.";

  return laneFromSteps(
    "deployment_progression",
    steps,
    deploymentPhaseIndex,
    scan,
    nextPhaseLabel,
  );
}

export function buildProviderIntelligenceProgressionLanes(input: {
  ctx: ProviderIntelligenceMaturityContext;
  maturity?: ProviderIntelligenceMaturitySnapshot;
  deploymentPhaseIndex: number;
  deploymentPhaseLabels: readonly string[];
  deploymentMomentumPercent: number;
  deploymentNextPhaseLabel: string | null;
  deploymentBlockedScan: string | null;
  commercialStage?: ProviderCommercialWorkflowStage;
}): IntelligenceProgressionLane[] {
  const maturity =
    input.maturity ?? buildProviderIntelligenceMaturitySnapshot(input.ctx);
  const commercialStage =
    input.commercialStage ??
    resolveProviderCommercialWorkflowStage({
      relationshipStage: input.ctx.relationshipStage,
      opportunities: input.ctx.opportunities,
      cases: input.ctx.cases,
      engagements: input.ctx.engagements,
    });
  const commercialConfidence = deriveIntelligenceSectionConfidence(
    "commercial_signals",
    input.ctx.contact,
  ).confidence;

  return [
    buildOperationalMaturityLane(maturity),
    buildDeploymentProgressionLane(
      input.deploymentPhaseIndex,
      input.deploymentPhaseLabels,
      input.deploymentMomentumPercent,
      input.deploymentNextPhaseLabel,
      input.deploymentBlockedScan,
    ),
    buildObservationReadinessLane(
      input.ctx.contact,
      input.ctx.planning,
      commercialStage,
    ),
    buildCommercializationLane(commercialStage, commercialConfidence),
  ];
}
