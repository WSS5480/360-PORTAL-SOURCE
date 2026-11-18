/**
 * Unified Sales Command pathway engine — canonical state for all six stages.
 */

import {
  isExecutionIntelligenceDbKey,
  optionalIntelligenceAffectsProgression,
} from "@/lib/surgical-sales/pathway/pathwayProgressionPolicy";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  countObservedProcedures,
  deriveGatedPathwayStage,
  isProductSalesConversationAllowed,
  isStageGateComplete,
  type PathwayGateInput,
  type PathwayGateEngagementRef,
} from "@/lib/surgical-sales/pathwayStageGates";
import {
  buildPathwayIntelligenceByStage,
  buildPathwayIntelligenceForStage,
  type PathwayIntelligenceSignalState,
} from "@/lib/surgical-sales/pathwayStageIntelligence";
import {
  pathwayStageHardGateBlockers,
  observationProgressPercent,
} from "@/lib/surgical-sales/pathway/pathwayProgressionPolicy";
import {
  evaluatePathwayAdvancement,
  type PathwayAdvancementEvaluation,
} from "@/lib/surgical-sales/pathway/pathwayStageAdvancement";
import {
  SALES_PATHWAY_STAGE_LABELS,
  SALES_PATHWAY_STAGE_OBJECTIVES,
  SALES_PATHWAY_STAGE_RANK,
  SALES_PATHWAY_STAGE_SHORT_LABELS,
  SALES_PATHWAY_STAGE_WORKSPACE,
  SALES_PATHWAY_WORKSPACE_LABELS,
  pathwayIntelligenceForStage,
  type SalesPathwayStageId,
  type SalesPathwayWorkspaceId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

export type SalesPathwayStageProgress = {
  stageId: SalesPathwayStageId;
  label: string;
  objective: string;
  percent: number;
  complete: boolean;
  workspaceId: SalesPathwayWorkspaceId;
  workspaceLabel: string;
};

export type SalesPathwayBlocker = {
  stageId: SalesPathwayStageId;
  signalId: string;
  label: string;
  summary: string | null;
};

export type SalesPathwayNextAction = {
  stageId: SalesPathwayStageId;
  workspaceId: SalesPathwayWorkspaceId;
  label: string;
  detail: string;
};

export type SalesPathwayState = {
  providerId: string;
  currentStage: SalesPathwayStageId;
  currentStageLabel: string;
  stageProgress: SalesPathwayStageProgress[];
  completedStageRequirements: SalesPathwayStageId[];
  blockers: SalesPathwayBlocker[];
  nextAction: SalesPathwayNextAction;
  requiredIntelligence: PathwayIntelligenceSignalState[];
  evidenceByStage: Record<SalesPathwayStageId, PathwayIntelligenceSignalState[]>;
  readinessByStage: Record<SalesPathwayStageId, { percent: number; complete: boolean }>;
  observedCaseCount: number;
  /** Completed observations on file — alias for pathway rules and UI. */
  completed_observation_count: number;
  productSalesAllowed: boolean;
  pathwayAdvancement: PathwayAdvancementEvaluation;
};

export type DeriveSalesPathwayStateInput = {
  providerId: string;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: PathwayGateEngagementRef[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
};

function gateProgressPercent(stageId: SalesPathwayStageId, input: PathwayGateInput): number {
  if (stageId === "observe") return observationProgressPercent(input);
  return isStageGateComplete(stageId, input) ? 100 : 0;
}

function nextActionForStage(
  stageId: SalesPathwayStageId,
  blockers: SalesPathwayBlocker[],
): SalesPathwayNextAction {
  const workspaceId = SALES_PATHWAY_STAGE_WORKSPACE[stageId];
  const top = blockers[0];

  const defaults: Record<SalesPathwayStageId, { label: string; detail: string }> = {
    discovery: {
      label: "Request observation approval",
      detail: "Set observation permission to Permission Confirmed to advance to Observation.",
    },
    observe: {
      label: "Schedule Next Observation",
      detail: "Complete five observations before preparing the provider debrief.",
    },
    debrief: {
      label: "Run debrief",
      detail: "Complete the provider debrief and validate product fit to advance to Evaluation.",
    },
    evaluation: {
      label: "Complete evaluation activity",
      detail: "Finish a product trial, 360 experience, in-service, education, or additional observation.",
    },
    commitment: {
      label: "Reach commitment case target",
      detail: "Complete committed product-support cases on file.",
    },
    outcomes: {
      label: "Track outcomes",
      detail: "Capture adoption, utilization, and clinical and business outcomes.",
    },
  };

  const fallback = defaults[stageId];
  return {
    stageId,
    workspaceId,
    label: top ? top.label : fallback.label,
    detail: top?.summary ?? fallback.detail,
  };
}

export function deriveSalesPathwayState(input: DeriveSalesPathwayStateInput): SalesPathwayState {
  const gateInput: PathwayGateInput = {
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
  };

  const currentStage = deriveGatedPathwayStage(gateInput);
  const evidenceByStage = buildPathwayIntelligenceByStage(gateInput);

  const readinessByStage = {} as Record<SalesPathwayStageId, { percent: number; complete: boolean }>;
  const stageProgress: SalesPathwayStageProgress[] = [];
  const completedStageRequirements: SalesPathwayStageId[] = [];

  for (const stageId of [
    "discovery",
    "observe",
    "debrief",
    "evaluation",
    "commitment",
    "outcomes",
  ] as const) {
    const signals = evidenceByStage[stageId];
    const percent = gateProgressPercent(stageId, gateInput);
    const complete = isStageGateComplete(stageId, gateInput);
    readinessByStage[stageId] = { percent, complete };
    if (complete) completedStageRequirements.push(stageId);
    stageProgress.push({
      stageId,
      label: SALES_PATHWAY_STAGE_LABELS[stageId],
      objective: SALES_PATHWAY_STAGE_OBJECTIVES[stageId],
      percent,
      complete,
      workspaceId: SALES_PATHWAY_STAGE_WORKSPACE[stageId],
      workspaceLabel: SALES_PATHWAY_WORKSPACE_LABELS[SALES_PATHWAY_STAGE_WORKSPACE[stageId]],
    });
  }

  const activeSignals = buildPathwayIntelligenceForStage(currentStage, gateInput);
  const blockers = pathwayStageHardGateBlockers(currentStage, gateInput);
  const pathwayAdvancement = evaluatePathwayAdvancement(gateInput);

  return {
    providerId: input.providerId,
    currentStage,
    currentStageLabel: SALES_PATHWAY_STAGE_LABELS[currentStage],
    stageProgress,
    completedStageRequirements,
    blockers,
    nextAction: nextActionForStage(currentStage, blockers),
    requiredIntelligence: activeSignals.filter(
      (s) => !s.met && !isExecutionIntelligenceDbKey(s.dbKey) && !optionalIntelligenceAffectsProgression(s.dbKey ?? ""),
    ),
    evidenceByStage,
    readinessByStage,
    observedCaseCount: countObservedProcedures(gateInput),
    completed_observation_count: countObservedProcedures(gateInput),
    productSalesAllowed: isProductSalesConversationAllowed(gateInput),
    pathwayAdvancement,
  };
}

/** Workspace deep link for the active stage (overview is read-only; workspaces capture intelligence). */
export function salesPathwayWorkspaceHref(
  providerId: string,
  stageId: SalesPathwayStageId,
  signalId?: string,
): string {
  const base = `/portal/sales/providers/${encodeURIComponent(providerId)}`;
  const workspace = SALES_PATHWAY_STAGE_WORKSPACE[stageId];
  const params = new URLSearchParams({ tab: "operations", workspace });
  if (stageId === "discovery") {
    params.set("mapping", "1");
    if (signalId) params.set("signal", signalId);
  }
  return `${base}?${params.toString()}`;
}

export function salesPathwayStageShortLabel(stageId: SalesPathwayStageId): string {
  return SALES_PATHWAY_STAGE_SHORT_LABELS[stageId];
}

export function isPathwayStageUnlocked(
  targetStage: SalesPathwayStageId,
  state: SalesPathwayState,
): boolean {
  return SALES_PATHWAY_STAGE_RANK[targetStage] <= SALES_PATHWAY_STAGE_RANK[state.currentStage];
}

export { SALES_PATHWAY_STAGE_IDS } from "@/lib/surgical-sales/salesPathwayCanonical";
export type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
