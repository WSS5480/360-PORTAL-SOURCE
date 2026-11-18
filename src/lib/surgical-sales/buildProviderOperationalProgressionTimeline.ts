/**
 * Horizontal operational progression timeline — maturity as six deployment phases.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderIntelligenceMaturitySnapshot,
  providerClinicalWorkflowValidated,
  providerMaturityStageCriteria,
  providerMaturityStageFullyMet,
  type ProviderIntelligenceMaturityContext,
  type ProviderIntelligenceMaturitySnapshot,
  type ProviderIntelligenceMaturityStage,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import { intelligenceUnlocksNextCapability } from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  OPERATIONAL_PROGRESSION_PHASE_IDS,
  OPERATIONAL_PROGRESSION_PHASE_LABELS,
  OPERATIONAL_PROGRESSION_TIMELINE_KICKER,
  OPERATIONAL_PROGRESSION_TIMELINE_TITLE,
  type OperationalProgressionPhaseId,
} from "@/lib/surgical-sales/operationalProgressionTimelineVocabulary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { resolveProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";

export {
  OPERATIONAL_PROGRESSION_TIMELINE_TITLE,
  OPERATIONAL_PROGRESSION_TIMELINE_KICKER,
  OPERATIONAL_PROGRESSION_PHASE_LABELS,
} from "@/lib/surgical-sales/operationalProgressionTimelineVocabulary";

export type OperationalProgressionPhaseStatus =
  | "complete"
  | "current"
  | "blocked"
  | "upcoming";

export type OperationalProgressionPhase = {
  id: OperationalProgressionPhaseId;
  order: number;
  label: string;
  status: OperationalProgressionPhaseStatus;
  blockReason?: string;
};

export type ProviderOperationalProgressionTimeline = {
  title: string;
  kicker: string;
  currentPhaseId: OperationalProgressionPhaseId;
  currentPhaseLabel: string;
  nextPhaseId: OperationalProgressionPhaseId | null;
  nextPhaseLabel: string | null;
  nextUnlockLabel: string;
  nextUnlockScan: string;
  momentumPercent: number;
  momentumLabel: string;
  blockedHeadline: string | null;
  phases: OperationalProgressionPhase[];
};

export function resolveOperationalProgressionPhaseIndex(
  _maturity: ProviderIntelligenceMaturitySnapshot,
  ctx: ProviderIntelligenceMaturityContext,
): number {
  if (!providerMaturityStageFullyMet("operationally_qualified", ctx)) {
    return 0;
  }
  if (!providerMaturityStageFullyMet("observation_ready", ctx)) {
    return 1;
  }
  if (!providerClinicalWorkflowValidated(ctx)) {
    return 2;
  }
  if (!providerMaturityStageFullyMet("evaluation_active", ctx)) {
    return 3;
  }
  if (!providerMaturityStageFullyMet("adoption_building", ctx)) {
    return 4;
  }
  return 5;
}

function nextPhaseId(current: OperationalProgressionPhaseId): OperationalProgressionPhaseId | null {
  const idx = OPERATIONAL_PROGRESSION_PHASE_IDS.indexOf(current);
  if (idx < 0 || idx >= OPERATIONAL_PROGRESSION_PHASE_IDS.length - 1) return null;
  return OPERATIONAL_PROGRESSION_PHASE_IDS[idx + 1]!;
}

const PROGRESSION_SCAN_SHORT: Partial<Record<string, string>> = {
  procedure_focus: "Confirm workflow fit",
  modality: "Map modality preferences",
  influence: "Map commercial influence",
  engagement_style: "Know surgeon engagement style",
  observation_allowed: "Validate OR access",
  credentialing_understood: "Understand credentialing path",
  coordinator_identified: "Identify coordinator",
  target_procedures: "Map target procedures",
  evaluation_openness: "Confirm trial willingness",
  competitive_landscape: "Map competitive landscape",
  decision_path: "Map decision path or champion",
  preference_card: "Understand preference-card path",
  champion: "Assess champion potential",
  workflow_validated: "Validate clinical workflow",
};

function scanLabelForUnmet(criterionId: string, fallback: string): string {
  return (
    PROGRESSION_SCAN_SHORT[criterionId] ??
    fallback.replace(/\s+captured$|\s+mapped$|\s+known$|\s+understood$|\s+identified$/i, "")
  );
}

function unlockScanForCriterion(
  maturity: ProviderIntelligenceMaturitySnapshot,
  criterionId: string,
  dbKey: string | undefined,
  label: string,
): string {
  if (dbKey) {
    return scanLine(intelligenceUnlocksNextCapability(dbKey), 56);
  }
  return scanLine(scanLabelForUnmet(criterionId, label), 56);
}

function momentumForPhase(
  currentIndex: number,
  ctx: ProviderIntelligenceMaturityContext,
): number {
  const gate = PHASE_EXIT_GATE[currentIndex];
  if (!gate) return 100;
  if (gate === "workflow") {
    return providerClinicalWorkflowValidated(ctx) ? 100 : 25;
  }
  const criteria = providerMaturityStageCriteria(gate, ctx);
  if (criteria.length === 0) return 0;
  const met = criteria.filter((c) => c.met).length;
  return Math.round((met / criteria.length) * 100);
}

function buildPhaseStatuses(
  currentIndex: number,
  ctx: ProviderIntelligenceMaturityContext,
): OperationalProgressionPhase[] {
  return OPERATIONAL_PROGRESSION_PHASE_IDS.map((id, order) => {
    let status: OperationalProgressionPhaseStatus = "upcoming";

    if (order < currentIndex) {
      status = "complete";
    } else if (order === currentIndex) {
      status = "current";
    }

    return {
      id,
      order,
      label: OPERATIONAL_PROGRESSION_PHASE_LABELS[id],
      status,
    };
  });
}

function momentumLabel(percent: number, nextLabel: string | null): string {
  if (!nextLabel) return "At full operational maturity";
  if (percent >= 85) return `Almost ready for ${nextLabel}`;
  if (percent >= 50) return `Building toward ${nextLabel}`;
  if (percent > 0) return `Early progress toward ${nextLabel}`;
  return `Building context before ${nextLabel}`;
}

type MaturityGateStage = Exclude<ProviderIntelligenceMaturityStage, "early_discovery">;

const PHASE_EXIT_GATE: Record<number, MaturityGateStage | "workflow"> = {
  0: "operationally_qualified",
  1: "observation_ready",
  2: "workflow",
  3: "evaluation_active",
  4: "adoption_building",
};

function firstUnmetForGate(
  gate: MaturityGateStage | "workflow",
  ctx: ProviderIntelligenceMaturityContext,
): { label: string; id: string; dbKey?: string } | null {
  if (gate === "workflow") {
    if (providerClinicalWorkflowValidated(ctx)) return null;
    return {
      id: "workflow_validated",
      label: "Clinical workflow validated",
      dbKey: "provider_procedure_focus",
    };
  }
  const unmet = providerMaturityStageCriteria(gate, ctx).find((c) => !c.met);
  if (!unmet) return null;
  return { id: unmet.id, label: unmet.label, dbKey: unmet.dbKey };
}

function unmetForPhaseTransition(
  currentIndex: number,
  ctx: ProviderIntelligenceMaturityContext,
): { label: string; id: string; dbKey?: string } | null {
  const gate = PHASE_EXIT_GATE[currentIndex];
  if (!gate) return null;
  return firstUnmetForGate(gate, ctx);
}

export function buildProviderOperationalProgressionTimeline(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  commercialStage?: ProviderCommercialWorkflowStage;
  maturity?: ProviderIntelligenceMaturitySnapshot;
}): ProviderOperationalProgressionTimeline {
  const ctx: ProviderIntelligenceMaturityContext = {
    contact: input.contact,
    planning: input.planning,
    relationshipStage: input.relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  };

  const maturity = input.maturity ?? buildProviderIntelligenceMaturitySnapshot(ctx);
  const currentIndex = resolveOperationalProgressionPhaseIndex(maturity, ctx);
  const currentPhaseId = OPERATIONAL_PROGRESSION_PHASE_IDS[currentIndex]!;
  const nextId = nextPhaseId(currentPhaseId);
  const nextPhaseLabel = nextId ? OPERATIONAL_PROGRESSION_PHASE_LABELS[nextId] : null;

  const transitionUnmet = unmetForPhaseTransition(currentIndex, ctx);
  const maturityUnmet = maturity.nextStageCriteria.find((c) => !c.met);

  const unmet = transitionUnmet ?? maturityUnmet ?? null;
  const nextUnlockScan = unmet
    ? unlockScanForCriterion(maturity, unmet.id, unmet.dbKey, unmet.label)
    : nextPhaseLabel
      ? `Advance to ${nextPhaseLabel}`
      : "Maintain validated intelligence on file";

  const blockedHeadline = null;

  const phases = buildPhaseStatuses(currentIndex, ctx);
  const momentumPercent = momentumForPhase(currentIndex, ctx);

  return {
    title: OPERATIONAL_PROGRESSION_TIMELINE_TITLE,
    kicker: OPERATIONAL_PROGRESSION_TIMELINE_KICKER,
    currentPhaseId,
    currentPhaseLabel: OPERATIONAL_PROGRESSION_PHASE_LABELS[currentPhaseId],
    nextPhaseId: nextId,
    nextPhaseLabel,
    nextUnlockLabel: "Next required unlock",
    nextUnlockScan,
    momentumPercent,
    momentumLabel: momentumLabel(momentumPercent, nextPhaseLabel),
    blockedHeadline,
    phases,
  };
}
