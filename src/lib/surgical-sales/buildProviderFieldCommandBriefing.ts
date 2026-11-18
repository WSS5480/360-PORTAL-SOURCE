/**
 * Field command briefing — procedural commercialization directive for provider overview.
 */

import {
  buildProviderOverviewDiscoveryAreas,
  type ProviderDiscoveryKnownItem,
  type ProviderDiscoveryUnknownItem,
} from "@/lib/surgical-sales/buildProviderOverviewDiscoveryAreas";
import { buildProviderOverviewStrategyGaps } from "@/lib/surgical-sales/buildProviderOverviewStrategyGaps";
import type { ProviderOverviewStageProgression } from "@/lib/surgical-sales/buildProviderOverviewStageProgression";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  PROVIDER_COMMERCIAL_WORKFLOW_STAGE_MISSION,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { discoveryPriorityExpectedOutcome } from "@/lib/surgical-sales/providerDiscoveryPriorityNarrative";
import { providerOperationalImpactForField } from "@/lib/surgical-sales/providerOperationalImpact";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type { ProviderFieldTimeRisk } from "@/lib/surgical-sales/buildProviderFieldTimeRisk";

export type ProviderFieldCommandBriefingItem = {
  label: string;
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
  operationalImpact: string;
};

export type ProviderFieldCommandBriefing = {
  /** Imperative operational directive for this account. */
  fieldCommand: string;
  laneLabel: string;
  validated: ProviderFieldCommandBriefingItem[];
  openRisks: ProviderFieldCommandBriefingItem[];
  /** What capturing the next maturity gate unlocks. */
  unlocksNextStage: string | null;
  nextFieldAction: string;
};

const SCHEDULING_DB_KEYS = new Set([
  "provider_observation_coordinator_contact",
  "provider_observation_cadence_preference",
  "provider_observation_best_days_case_types",
]);

const ACCESS_DB_KEYS = new Set([
  "provider_observation_access_path",
  "provider_observation_feasibility",
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
]);

function sectionPriority(
  commercialStage: ProviderCommercialWorkflowStage,
  sectionId: ProviderIntelligenceSectionId,
): number {
  const primary: ProviderIntelligenceSectionId =
    commercialStage === "early_discovery" || commercialStage === "observation"
      ? "observation_readiness"
      : commercialStage === "evaluation"
        ? "commercial_signals"
        : "clinical_workflow";
  if (sectionId === primary) return 0;
  if (sectionId === "clinical_workflow") return 1;
  if (sectionId === "or_environment") return 2;
  if (sectionId === "commercial_signals") return 3;
  return 4;
}

function collectBriefingItems<T extends { sectionId: ProviderIntelligenceSectionId; label: string; dbKey: string }>(
  areas: ReturnType<typeof buildProviderOverviewDiscoveryAreas>,
  pick: (area: (typeof areas)[number]) => T[],
  commercialStage: ProviderCommercialWorkflowStage,
  limit: number,
): ProviderFieldCommandBriefingItem[] {
  const ranked = areas
    .flatMap((area) => pick(area))
    .sort(
      (a, b) =>
        sectionPriority(commercialStage, a.sectionId) - sectionPriority(commercialStage, b.sectionId),
    );

  const seen = new Set<string>();
  const out: ProviderFieldCommandBriefingItem[] = [];
  for (const item of ranked) {
    if (seen.has(item.dbKey)) continue;
    seen.add(item.dbKey);
    out.push({
      ...item,
      operationalImpact: providerOperationalImpactForField(item.dbKey),
    });
    if (out.length >= limit) break;
  }
  return out;
}

function buildFieldCommandDirective(input: {
  commercialStage: ProviderCommercialWorkflowStage;
  openRisks: ProviderFieldCommandBriefingItem[];
  progression: ProviderOverviewStageProgression | null;
  fieldTimeRisk?: ProviderFieldTimeRisk | null;
}): string {
  if (input.fieldTimeRisk?.protectFieldTime) {
    const pft = input.fieldTimeRisk.protectFieldTime;
    if (pft.posture !== "clear_to_deploy") {
      return pft.headline;
    }
    return `${pft.postureLabel} — ${scanLine(pft.deploymentRecommendation, 80)}`;
  }
  if (input.fieldTimeRisk) {
    const { state, guidance } = input.fieldTimeRisk;
    if (state === "high_wasted_field_risk") {
      return guidance;
    }
    if (state === "requires_remote_validation_first") {
      const top = input.openRisks[0]?.label;
      return top
        ? `${guidance} Priority: ${top}.`
        : guidance;
    }
    if (state === "efficient_field_target") {
      return "Proceed — observation pathway supports OR / field time.";
    }
    return guidance;
  }
  const top = input.openRisks[0];
  const topKey = top?.dbKey ?? "";
  const topLabel = top?.label.toLowerCase() ?? "";

  if (
    SCHEDULING_DB_KEYS.has(topKey) ||
    /\b(coordinator|cadence|posting|scheduling|window)\b/i.test(topLabel)
  ) {
    return "Map OR scheduling pathway before additional field allocation.";
  }

  if (
    ACCESS_DB_KEYS.has(topKey) ||
    /\b(access|credential|committee|gate|allowance)\b/i.test(topLabel)
  ) {
    return "Clear OR access and credentialing gates before booking observation time.";
  }

  if (/\b(workflow|procedure|modality|technique)\b/i.test(topLabel)) {
    return "Document live workflow and procedure focus before product-heavy field time.";
  }

  if (/\b(vendor|incumbent|competitive|evaluation)\b/i.test(topLabel)) {
    return "Map commercial path and evaluation blockers before advancing the trial.";
  }

  const firstOpen = input.progression?.items.find((item) => !item.met);
  if (firstOpen && input.progression) {
    return `${firstOpen.scanLabel} before advancing to ${input.progression.nextStageLabel}.`;
  }

  return scanLine(PROVIDER_COMMERCIAL_WORKFLOW_STAGE_MISSION[input.commercialStage], 80);
}

function buildUnlocksNextStage(input: {
  progression: ProviderOverviewStageProgression | null;
  openRisks: ProviderFieldCommandBriefingItem[];
}): string | null {
  const firstOpen = input.progression?.items.find((item) => !item.met);
  if (firstOpen && input.progression) {
    return scanLine(`${input.progression.nextStageLabel} ← ${firstOpen.scanLabel}`, 48);
  }

  const topGap = input.openRisks[0];
  if (topGap) {
    return scanLine(discoveryPriorityExpectedOutcome(topGap.dbKey), 48);
  }

  return null;
}

function operationalizeNextAction(text: string): string {
  return text
    .replace(/^recommended next step:\s*/i, "")
    .replace(/^next step:\s*/i, "")
    .trim();
}

export function buildProviderFieldCommandBriefing(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  commercialStage: ProviderCommercialWorkflowStage;
  laneLabel: string;
  recommendedNextStep: string;
  progression: ProviderOverviewStageProgression | null;
  fieldTimeRisk?: ProviderFieldTimeRisk | null;
  maxValidated?: number;
  maxOpenRisks?: number;
}): ProviderFieldCommandBriefing {
  const maxValidated = input.maxValidated ?? 4;
  const maxOpenRisks = input.maxOpenRisks ?? 4;

  const areas = buildProviderOverviewDiscoveryAreas({
    contact: input.contact,
    commercialStage: input.commercialStage,
    maxKnownPerArea: 3,
    maxUnknownPerArea: 3,
  });

  const strategyGaps = buildProviderOverviewStrategyGaps({
    contact: input.contact,
    planning: input.planning ?? null,
    commercialStage: input.commercialStage,
    maxItems: maxOpenRisks,
  });

  let validated = collectBriefingItems(
    areas,
    (area) => area.known as ProviderDiscoveryKnownItem[],
    input.commercialStage,
    maxValidated,
  );

  let openRisks = collectBriefingItems(
    areas,
    (area) => area.unknown as ProviderDiscoveryUnknownItem[],
    input.commercialStage,
    maxOpenRisks,
  );

  if (openRisks.length === 0 && strategyGaps.length > 0) {
    openRisks = strategyGaps.map((gap) => ({
      label: gap.headline,
      dbKey: gap.dbKey,
      sectionId: gap.sectionId,
      operationalImpact: gap.operationalImpact,
    }));
  }

  if (validated.length === 0) {
    const metProgression = input.progression?.items.filter((item) => item.met) ?? [];
    validated = metProgression.slice(0, maxValidated).map((item) => ({
      label: item.scanLabel,
      dbKey: item.id,
      sectionId: item.sectionId ?? "observation_readiness",
      operationalImpact: providerOperationalImpactForField(item.id),
    }));
  }

  const fieldCommand = buildFieldCommandDirective({
    commercialStage: input.commercialStage,
    openRisks,
    progression: input.progression,
    fieldTimeRisk: input.fieldTimeRisk,
  });

  return {
    fieldCommand,
    laneLabel: input.laneLabel,
    validated,
    openRisks,
    unlocksNextStage: buildUnlocksNextStage({ progression: input.progression, openRisks }),
    nextFieldAction: scanLine(operationalizeNextAction(input.recommendedNextStep), 88),
  };
}
