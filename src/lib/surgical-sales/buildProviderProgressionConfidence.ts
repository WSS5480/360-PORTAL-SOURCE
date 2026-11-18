/**
 * Pathway operational readiness — signal-derived readiness to advance observation / evaluation / adoption.
 * No arbitrary sales scores; rep-facing tiers only.
 */

import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  isUpcomingEngagementStatus,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { observationIsAllowed } from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import {
  deriveIntelligenceSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  buildProviderOverviewQualitativeReadiness,
  type ProviderOverviewOperationalState,
  type ProviderOverviewReadinessDimensionId,
  type ProviderOverviewReadinessIndicator,
} from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  OPERATIONAL_MATURITY_PROGRESSION_INDICATOR_LABELS,
  OPERATIONAL_MATURITY_PROGRESSION_TIER_LABELS,
} from "@/lib/surgical-sales/providerOperationalMaturityVocabulary";

export type ProgressionConfidenceTier = "emerging" | "low" | "moderate" | "solid";

export type ProgressionConfidenceTarget = "observation" | "evaluation" | "adoption";

export type ProviderProgressionConfidenceIndicator = {
  id: ProgressionConfidenceTarget;
  label: string;
  confidence: ProgressionConfidenceTier;
  confidenceLabel: string;
  /** One-line basis (signals, not CRM stage alone). */
  scan: string;
};

export const PROGRESSION_CONFIDENCE_TIER_LABELS: Record<ProgressionConfidenceTier, string> = {
  ...OPERATIONAL_MATURITY_PROGRESSION_TIER_LABELS,
};

export const PROGRESSION_CONFIDENCE_INDICATOR_LABELS: Record<ProgressionConfidenceTarget, string> = {
  ...OPERATIONAL_MATURITY_PROGRESSION_INDICATOR_LABELS,
};

const CONFIDENCE_RANK: Record<ProgressionConfidenceTier, number> = {
  emerging: 0,
  low: 1,
  moderate: 2,
  solid: 3,
};

const EVALUATION_OPPORTUNITY_STAGES = new Set<SalesStage>([
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
  "outcome_review",
]);

const ADOPTION_OPPORTUNITY_STAGES = new Set<SalesStage>([
  "preference_card_progress",
  "adoption_expanding",
  "won",
]);

const OBSERVATION_RELATIONSHIP_STAGES = new Set([
  "observation_requested",
  "observation_scheduled",
]);

const OBSERVATION_ENGAGEMENT_TYPES = new Set([
  "observation_request",
  "or_visit",
  "or_observation",
]);

const ACCESS_BLOCKER_PATTERNS =
  /\b(block|denied|restricted|committee|gate|not allowed|no vendor|limited access|credentialing required)\b/i;

function confidencePoints(confidence: IntelligenceSectionConfidence): number {
  switch (confidence) {
    case "validated":
      return 3;
    case "confirmed":
      return 2;
    case "partial":
      return 1;
    default:
      return 0;
  }
}

function readinessPoints(state: ProviderOverviewOperationalState): number {
  switch (state) {
    case "observation_ready":
    case "evaluation_active":
    case "adoption_building":
      return 3;
    case "operationally_viable":
      return 2;
    case "partially_validated":
      return 1;
    default:
      return 0;
  }
}

function indicatorById(
  indicators: ProviderOverviewReadinessIndicator[],
  id: ProviderOverviewReadinessDimensionId,
): ProviderOverviewReadinessIndicator | undefined {
  return indicators.find((i) => i.id === id);
}

function tierFromPoints(points: number, maxPoints: number, blockers = 0): ProgressionConfidenceTier {
  if (blockers >= 2 || (blockers >= 1 && points <= 4)) return "emerging";
  if (maxPoints <= 0) return "emerging";

  const ratio = points / maxPoints;
  if (ratio >= 0.72) return "solid";
  if (ratio >= 0.48) return "moderate";
  if (ratio >= 0.22) return "low";
  return "emerging";
}

function fieldSignal(contact: Record<string, unknown>, dbKey: string): boolean {
  return fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined);
}

function hasSchedulingSignals(contact: Record<string, unknown>): number {
  let pts = 0;
  if (fieldSignal(contact, "provider_observation_coordinator_contact")) pts += 2;
  if (fieldSignal(contact, "provider_observation_cadence_preference")) pts += 1;
  if (fieldSignal(contact, "provider_observation_best_days_case_types")) pts += 1;
  return pts;
}

function hasOrAccessSignals(contact: Record<string, unknown>): { points: number; blockers: number } {
  let points = 0;
  let blockers = 0;

  if (fieldSignal(contact, "provider_observation_feasibility")) {
    points += 2;
    if (!observationIsAllowed(contact)) blockers += 1;
  } else {
    blockers += 1;
  }

  if (fieldSignal(contact, "provider_observation_access_path")) {
    points += 1;
    if (ACCESS_BLOCKER_PATTERNS.test(String(contact.provider_observation_access_path ?? ""))) {
      blockers += 1;
    }
  }

  if (fieldSignal(contact, "provider_observation_credentialing_needed")) {
    points += 1;
  }

  return { points, blockers };
}

function engagementObservationMotion(
  relationshipStage: string,
  engagements: ProviderEngagementSummary[],
): number {
  const rel = relationshipStage.trim().toLowerCase();
  if (OBSERVATION_RELATIONSHIP_STAGES.has(rel)) return 2;

  const hasObsEngagement = engagements.some((e) =>
    OBSERVATION_ENGAGEMENT_TYPES.has(String(e.engagement_type || "").toLowerCase()),
  );
  if (hasObsEngagement) return 2;

  const hasUpcomingField = engagements.some(
    (e) =>
      isUpcomingEngagementStatus(e.status) &&
      OBSERVATION_ENGAGEMENT_TYPES.has(String(e.engagement_type || "").toLowerCase()),
  );
  if (hasUpcomingField) return 1;

  return 0;
}

function opportunitiesInStages(
  opportunities: Array<Record<string, unknown>> | undefined,
  stages: Set<SalesStage>,
): boolean {
  return (opportunities ?? []).some((o) => {
    const stage = normalizeSalesStage(String(o.stage || ""));
    return stage != null && stages.has(stage);
  });
}

function buildObservationConfidence(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  indicators: ProviderOverviewReadinessIndicator[];
  engagements: ProviderEngagementSummary[];
}): ProviderProgressionConfidenceIndicator {
  const obsSection = deriveIntelligenceSectionConfidence("observation_readiness", input.contact).confidence;
  const clinical = deriveIntelligenceSectionConfidence("clinical_workflow", input.contact).confidence;
  const orEnv = deriveIntelligenceSectionConfidence("or_environment", input.contact).confidence;
  const workflowConf = confidencePoints(clinical) >= confidencePoints(orEnv) ? clinical : orEnv;

  const obsReadiness = indicatorById(input.indicators, "observation_readiness");
  const relationship = indicatorById(input.indicators, "relationship_maturity");

  const schedulingPts = hasSchedulingSignals(input.contact);
  const { points: accessPts, blockers: accessBlockers } = hasOrAccessSignals(input.contact);
  const engagementPts = engagementObservationMotion(input.relationshipStage, input.engagements);

  let points =
    confidencePoints(obsSection) +
    confidencePoints(workflowConf) +
    schedulingPts +
    accessPts +
    readinessPoints(obsReadiness?.state ?? "emerging") +
    Math.min(2, readinessPoints(relationship?.state ?? "emerging")) +
    engagementPts;

  const blockers = accessBlockers;
  const maxPoints = 16;

  if (input.commercialStage === "adoption" || input.commercialStage === "evaluation") {
    points = Math.max(points, 11);
  }

  const confidence = tierFromPoints(points, maxPoints, 0);

  const scanParts: string[] = [];
  if (accessBlockers > 0) scanParts.push("OR access gates open");
  else if (confidencePoints(obsSection) >= 2) scanParts.push("OR access mapped");
  if (schedulingPts >= 2) scanParts.push("scheduling authority on file");
  else if (schedulingPts === 0) scanParts.push("scheduling authority thin");
  if (confidencePoints(workflowConf) >= 2) scanParts.push("workflow intelligence sufficient");
  if (engagementPts >= 2) scanParts.push("observation motion live");

  return {
    id: "observation",
    label: PROGRESSION_CONFIDENCE_INDICATOR_LABELS.observation,
    confidence,
    confidenceLabel: PROGRESSION_CONFIDENCE_TIER_LABELS[confidence],
    scan: scanLine(scanParts.join(" · ") || "Intelligence still forming for observation entry", 72),
  };
}

function buildEvaluationConfidence(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  indicators: ProviderOverviewReadinessIndicator[];
  opportunities?: Array<Record<string, unknown>>;
  engagements: ProviderEngagementSummary[];
}): ProviderProgressionConfidenceIndicator {
  const commercialSection = deriveIntelligenceSectionConfidence("commercial_signals", input.contact)
    .confidence;
  const workflow = indicatorById(input.indicators, "workflow_understanding");
  const commercial = indicatorById(input.indicators, "commercial_influence");
  const observation = indicatorById(input.indicators, "observation_readiness");

  const evalOpen = fieldSignal(input.contact, "provider_evaluation_openness");
  const hasEvalOpp = opportunitiesInStages(input.opportunities, EVALUATION_OPPORTUNITY_STAGES);
  const hasDemo = input.engagements.some((e) =>
    String(e.engagement_type || "").toLowerCase().includes("demo"),
  );

  let points =
    confidencePoints(commercialSection) +
    readinessPoints(workflow?.state ?? "emerging") +
    readinessPoints(commercial?.state ?? "emerging") +
    Math.min(3, readinessPoints(observation?.state ?? "emerging")) +
    (evalOpen ? 1 : 0) +
    (hasEvalOpp ? 2 : 0) +
    (hasDemo ? 1 : 0);

  let blockers = 0;
  if (readinessPoints(observation?.state ?? "emerging") < 2) blockers += 1;
  if (!evalOpen && !hasEvalOpp) blockers += 1;

  if (input.commercialStage === "early_discovery") {
    points = Math.min(points, 6);
  } else if (input.commercialStage === "observation") {
    points = Math.min(points, 9);
  }

  if (input.commercialStage === "adoption") {
    points = Math.max(points, 12);
  }

  const confidence = tierFromPoints(points, 15, blockers);

  const scanParts: string[] = [];
  if (hasEvalOpp) scanParts.push("evaluation motion on file");
  if (confidencePoints(commercialSection) >= 2) scanParts.push("commercial influence mapped");
  if (readinessPoints(workflow?.state ?? "emerging") >= 2) scanParts.push("workflow intelligence ready");
  if (readinessPoints(observation?.state ?? "emerging") < 2) scanParts.push("observation pathway still thin");

  return {
    id: "evaluation",
    label: PROGRESSION_CONFIDENCE_INDICATOR_LABELS.evaluation,
    confidence,
    confidenceLabel: PROGRESSION_CONFIDENCE_TIER_LABELS[confidence],
    scan: scanLine(scanParts.join(" · ") || "Evaluation path not yet supported by signals", 72),
  };
}

function buildAdoptionConfidence(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  indicators: ProviderOverviewReadinessIndicator[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderProgressionConfidenceIndicator {
  const commercialSection = deriveIntelligenceSectionConfidence("commercial_signals", input.contact)
    .confidence;
  const commercial = indicatorById(input.indicators, "commercial_influence");
  const relationship = indicatorById(input.indicators, "relationship_maturity");

  const hasAdoptionOpp = opportunitiesInStages(input.opportunities, ADOPTION_OPPORTUNITY_STAGES);
  const hasCases = (input.cases ?? []).length > 0;
  const prefCard = fieldSignal(input.contact, "provider_preference_card_signals");
  const champion = fieldSignal(input.contact, "provider_champion_potential");

  let points =
    confidencePoints(commercialSection) +
    readinessPoints(commercial?.state ?? "emerging") +
    readinessPoints(relationship?.state ?? "emerging") +
    (hasAdoptionOpp ? 3 : 0) +
    (hasCases ? 2 : 0) +
    (prefCard ? 1 : 0) +
    (champion ? 1 : 0);

  let blockers = 0;
  if (readinessPoints(commercial?.state ?? "emerging") < 2) blockers += 1;

  if (input.commercialStage === "early_discovery") {
    points = Math.min(points, 4);
  } else if (input.commercialStage === "observation") {
    points = Math.min(points, 7);
  } else if (input.commercialStage === "evaluation") {
    points = Math.min(points, 10);
  }

  const confidence = tierFromPoints(points, 14, blockers);

  const scanParts: string[] = [];
  if (hasAdoptionOpp) scanParts.push("product fit signals");
  if (hasCases) scanParts.push("supported cases logged");
  if (confidencePoints(commercialSection) >= 2) scanParts.push("commercial path validated");
  if (prefCard) scanParts.push("preference-card intelligence captured");

  return {
    id: "adoption",
    label: PROGRESSION_CONFIDENCE_INDICATOR_LABELS.adoption,
    confidence,
    confidenceLabel: PROGRESSION_CONFIDENCE_TIER_LABELS[confidence],
    scan: scanLine(scanParts.join(" · ") || "Expansion signals still early", 72),
  };
}

export function buildProviderProgressionConfidence(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  readinessIndicators?: ProviderOverviewReadinessIndicator[];
}): ProviderProgressionConfidenceIndicator[] {
  const indicators =
    input.readinessIndicators ??
    buildProviderOverviewQualitativeReadiness({
      contact: input.contact,
      relationshipStage: input.relationshipStage,
      commercialStage: input.commercialStage,
      engagements: input.engagements,
      opportunities: input.opportunities,
    });

  const engagements = input.engagements ?? [];

  return [
    buildObservationConfidence({
      contact: input.contact,
      relationshipStage: input.relationshipStage,
      commercialStage: input.commercialStage,
      indicators,
      engagements,
    }),
    buildEvaluationConfidence({
      contact: input.contact,
      commercialStage: input.commercialStage,
      indicators,
      opportunities: input.opportunities,
      engagements,
    }),
    buildAdoptionConfidence({
      contact: input.contact,
      commercialStage: input.commercialStage,
      indicators,
      opportunities: input.opportunities,
      cases: input.cases,
    }),
  ];
}

/** Weakest tier across pathways (for tone / warnings). */
export function weakestProgressionConfidenceTier(
  indicators: ProviderProgressionConfidenceIndicator[],
): ProgressionConfidenceTier {
  if (indicators.length === 0) return "emerging";
  return indicators.reduce<ProgressionConfidenceTier>(
    (weakest, row) =>
      CONFIDENCE_RANK[row.confidence] < CONFIDENCE_RANK[weakest] ? row.confidence : weakest,
    indicators[0]!.confidence,
  );
}
