/**
 * Commercial momentum — operational account state for provider accounts.
 * Replaces generic labels (e.g. "Discovery Needed") with field-rep-ready momentum.
 */

import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { isUpcomingEngagementStatus } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { IntelligenceStrengthLabel } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import { intelligenceCaptureHasSignal } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  findPlanningSection,
  type ProviderPlanningCompletion,
  type ProviderPlanningSectionId,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderPlanningStatus } from "@/lib/surgical-sales/providerPlanning";
import {
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";

export const PROVIDER_COMMERCIAL_MOMENTUM_STATES = [
  "early_discovery",
  "observation_ready",
  "evaluation_risk",
  "adoption_building",
  "expansion_opportunity",
] as const;

export type ProviderCommercialMomentumState = (typeof PROVIDER_COMMERCIAL_MOMENTUM_STATES)[number];

export type ProviderCommercialMomentumTone =
  | "neutral"
  | "brand"
  | "success"
  | "warn"
  | "opportunity";

export type ProviderCommercialMomentum = {
  state: ProviderCommercialMomentumState;
  label: string;
  summary: string;
  tone: ProviderCommercialMomentumTone;
  /** Short signals explaining why this state was chosen (overview subcopy). */
  drivers: string[];
};

export const PROVIDER_COMMERCIAL_MOMENTUM_LABELS: Record<ProviderCommercialMomentumState, string> = {
  early_discovery: "Early Discovery",
  observation_ready: "Observation Ready",
  evaluation_risk: "Evaluation Risk",
  adoption_building: "Adoption Building",
  expansion_opportunity: "Expansion Opportunity",
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

const EXPANSION_OPPORTUNITY_STAGES = new Set<SalesStage>(["adoption_expanding", "won"]);

const OBSERVATION_RELATIONSHIP_STAGES = new Set([
  "observation_requested",
  "observation_scheduled",
]);

type MomentumSignals = {
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  intelOverall: IntelligenceStrengthLabel;
  intelProductStatus: IntelligenceStrengthLabel;
  planningStatus: ProviderPlanningStatus;
  observationReadinessPercent: number;
  observationFeasibilityCaptured: boolean;
  evaluationOpennessCaptured: boolean;
  commercialSignalsPercent: number;
  hasUpcomingEngagement: boolean;
  hasIncompletePrep: boolean;
  completedEngagements: number;
  hasEvalOpportunities: boolean;
  hasAdoptionOpportunities: boolean;
  hasExpansionOpportunity: boolean;
  hasOpportunities: boolean;
  hasCases: boolean;
  dormant: boolean;
};

function countCompletedEngagements(engagements: ProviderEngagementSummary[]): number {
  return engagements.filter((e) => String(e.status || "").toLowerCase() === "completed").length;
}

function opportunitiesInStages(
  opportunities: Array<Record<string, unknown>>,
  stages: Set<SalesStage>,
): boolean {
  return opportunities.some((o) => {
    const stage = normalizeSalesStage(String(o.stage || ""));
    return Boolean(stage && stages.has(stage));
  });
}

function trackStatusFromPlanning(
  planning: ProviderPlanningCompletion | null | undefined,
  sectionId: ProviderPlanningSectionId,
  aggregatePercent: number,
): IntelligenceStrengthLabel {
  const section = planning ? findPlanningSection(planning, sectionId) : null;
  const percent = section?.percent ?? aggregatePercent;
  if (!planning || planning.status === "not_started" || percent === 0) return "Limited";
  if (percent >= 70) return "Strong";
  if (percent >= 25) return "Building";
  return "Limited";
}

function collectSignals(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  planning?: ProviderPlanningCompletion | null;
  engagements: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  intelOverall: IntelligenceStrengthLabel;
  intelProductStatus: IntelligenceStrengthLabel;
}): MomentumSignals {
  const relationshipStage = String(input.relationshipStage || "prospect").trim().toLowerCase();
  const planning = input.planning ?? null;
  const opportunities = input.opportunities ?? [];
  const engagements = input.engagements ?? [];

  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities,
    cases: input.cases,
    engagements,
  });

  const obsSection = planning ? findPlanningSection(planning, "observation_readiness") : null;
  const commercialSection = planning ? findPlanningSection(planning, "commercial_signals") : null;

  const upcoming = engagements.filter((e) => isUpcomingEngagementStatus(e.status));
  const nextUpcoming = upcoming[0];
  const hasIncompletePrep = Boolean(
    nextUpcoming &&
      nextUpcoming.status === "planned" &&
      nextUpcoming.pre_call_total > 0 &&
      !nextUpcoming.pre_call_complete,
  );

  return {
    relationshipStage,
    commercialStage,
    intelOverall: input.intelOverall,
    intelProductStatus: input.intelProductStatus,
    planningStatus: planning?.status ?? "not_started",
    observationReadinessPercent: obsSection?.percent ?? 0,
    observationFeasibilityCaptured: intelligenceCaptureHasSignal(
      "provider_observation_feasibility",
      String(input.contact.provider_observation_feasibility ?? ""),
    ),
    evaluationOpennessCaptured: intelligenceCaptureHasSignal(
      "provider_evaluation_openness",
      String(input.contact.provider_evaluation_openness ?? ""),
    ),
    commercialSignalsPercent: commercialSection?.percent ?? 0,
    hasUpcomingEngagement: upcoming.length > 0,
    hasIncompletePrep,
    completedEngagements: countCompletedEngagements(engagements),
    hasEvalOpportunities: opportunitiesInStages(opportunities, EVALUATION_OPPORTUNITY_STAGES),
    hasAdoptionOpportunities: opportunitiesInStages(opportunities, ADOPTION_OPPORTUNITY_STAGES),
    hasExpansionOpportunity: opportunitiesInStages(opportunities, EXPANSION_OPPORTUNITY_STAGES),
    hasOpportunities: opportunities.length > 0,
    hasCases: (input.cases?.length ?? 0) > 0,
    dormant: relationshipStage === "dormant" || relationshipStage === "archived",
  };
}

function scoreExpansionOpportunity(s: MomentumSignals): number {
  if (s.dormant) return 0;
  let score = 0;
  if (s.relationshipStage === "established_customer") score += 45;
  if (s.commercialStage === "adoption") score += 35;
  if (s.hasExpansionOpportunity) score += 40;
  if (s.hasAdoptionOpportunities && s.intelOverall === "Strong") score += 25;
  if (s.hasCases && s.completedEngagements >= 2) score += 15;
  if (s.intelProductStatus === "Strong") score += 10;
  return score;
}

function scoreAdoptionBuilding(s: MomentumSignals): number {
  if (s.dormant) return 0;
  let score = 0;
  if (s.commercialStage === "adoption") score += 30;
  if (s.hasAdoptionOpportunities) score += 35;
  if (s.hasCases) score += 20;
  if (s.hasOpportunities) score += 15;
  if (s.intelProductStatus === "Building" || s.intelProductStatus === "Strong") score += 15;
  if (s.completedEngagements >= 2) score += 10;
  if (s.commercialSignalsPercent >= 50) score += 10;
  return score;
}

function scoreEvaluationRisk(s: MomentumSignals): number {
  if (s.dormant) return 0;
  let score = 0;
  if (s.commercialStage === "evaluation") score += 35;
  if (s.relationshipStage === "active_relationship") score += 20;
  if (s.hasEvalOpportunities) score += 15;

  const commercialThin =
    s.intelProductStatus === "Limited" ||
    s.commercialSignalsPercent < 35 ||
    !s.evaluationOpennessCaptured;
  if (commercialThin) score += 30;

  if (!s.hasOpportunities && s.completedEngagements > 0) score += 25;
  if (s.hasIncompletePrep) score += 20;
  if (s.planningStatus === "needs_update") score += 15;
  if (s.hasUpcomingEngagement && !s.evaluationOpennessCaptured) score += 10;

  if (s.commercialStage === "observation" || s.commercialStage === "early_discovery") {
    score = Math.floor(score * 0.4);
  }
  return score;
}

function scoreObservationReady(s: MomentumSignals): number {
  if (s.dormant) return 0;
  let score = 0;
  if (OBSERVATION_RELATIONSHIP_STAGES.has(s.relationshipStage)) score += 40;
  if (s.commercialStage === "observation") score += 35;
  if (s.observationReadinessPercent >= 50) score += 25;
  else if (s.observationReadinessPercent >= 25) score += 15;
  if (s.observationFeasibilityCaptured) score += 15;
  if (s.hasUpcomingEngagement && s.relationshipStage.includes("observation")) score += 10;
  if (s.commercialStage === "evaluation" || s.commercialStage === "adoption") {
    score = Math.floor(score * 0.35);
  }
  return score;
}

function scoreEarlyDiscovery(s: MomentumSignals): number {
  if (s.dormant) return 25;
  let score = 28;
  if (s.relationshipStage === "prospect") score += 35;
  if (s.relationshipStage === "pre_call_planning") score += 30;
  if (s.relationshipStage === "engagement_active") score += 25;
  if (s.intelOverall === "Limited") score += 20;
  if (s.completedEngagements === 0) score += 15;
  if (s.commercialStage === "early_discovery") score += 15;
  return score;
}

const STATE_RANK: Record<ProviderCommercialMomentumState, number> = {
  expansion_opportunity: 5,
  adoption_building: 4,
  evaluation_risk: 3,
  observation_ready: 2,
  early_discovery: 1,
};

function buildSummary(state: ProviderCommercialMomentumState, s: MomentumSignals): string {
  switch (state) {
    case "expansion_opportunity":
      return "Mature adoption motion — prioritize expansion, preference-card progress, and share growth.";
    case "adoption_building":
      return "Trial and adoption work is underway — keep cases, opportunities, and intelligence aligned to conversion.";
    case "evaluation_risk":
      return "Evaluation is active but signals are thin — close commercial unknowns before the next touch.";
    case "observation_ready":
      return "Field access is the bottleneck — confirm OR path and schedule observation before evaluation.";
    case "early_discovery":
    default:
      if (s.dormant) {
        return "Relationship is quiet — re-establish contact before investing in observation or evaluation.";
      }
      return "Prove procedural fit and relationship access before advancing to observation or trial.";
  }
}

function buildDrivers(state: ProviderCommercialMomentumState, s: MomentumSignals): string[] {
  const drivers: string[] = [];

  if (state === "expansion_opportunity") {
    if (s.hasExpansionOpportunity) drivers.push("Expansion-stage opportunity in motion");
    if (s.hasCases) drivers.push("Supported cases on file");
    if (s.intelOverall === "Strong") drivers.push("Strong commercial intelligence");
  } else if (state === "adoption_building") {
    if (s.hasAdoptionOpportunities) drivers.push("Adoption workflow on an opportunity");
    if (s.hasCases) drivers.push("Cases linked to adoption work");
    if (s.completedEngagements > 0) drivers.push("Engagement progression");
  } else if (state === "evaluation_risk") {
    if (s.intelProductStatus === "Limited") drivers.push("Commercial intelligence still developing");
    if (!s.evaluationOpennessCaptured) drivers.push("Evaluation openness not confirmed");
    if (!s.hasOpportunities) drivers.push("No opportunity tracking evaluation");
    if (s.hasIncompletePrep) drivers.push("Pre-call prep still open");
  } else if (state === "observation_ready") {
    if (OBSERVATION_RELATIONSHIP_STAGES.has(s.relationshipStage)) {
      drivers.push("Observation on the relationship path");
    }
    if (s.observationReadinessPercent > 0) {
      drivers.push(`Observation readiness ${s.observationReadinessPercent}% captured`);
    } else {
      drivers.push("OR access still needs confirmation");
    }
  } else {
    if (s.completedEngagements === 0) drivers.push("No completed engagements yet");
    if (s.intelOverall === "Limited") drivers.push("Workflow intelligence still forming");
    if (s.dormant) drivers.push("Dormant relationship");
  }

  return drivers.slice(0, 3);
}

function toneForState(state: ProviderCommercialMomentumState, s: MomentumSignals): ProviderCommercialMomentumTone {
  if (s.dormant) return "warn";
  switch (state) {
    case "expansion_opportunity":
      return "opportunity";
    case "adoption_building":
      return "success";
    case "evaluation_risk":
      return "warn";
    case "observation_ready":
      return "brand";
    default:
      return "neutral";
  }
}

function pickState(scores: Record<ProviderCommercialMomentumState, number>): ProviderCommercialMomentumState {
  let best: ProviderCommercialMomentumState = "early_discovery";
  let bestScore = -1;
  for (const state of PROVIDER_COMMERCIAL_MOMENTUM_STATES) {
    const score = scores[state];
    if (
      score > bestScore ||
      (score === bestScore && STATE_RANK[state] > STATE_RANK[best])
    ) {
      best = state;
      bestScore = score;
    }
  }
  return best;
}

export function resolveProviderCommercialMomentum(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  planning?: ProviderPlanningCompletion | null;
  engagements: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  intelOverall: IntelligenceStrengthLabel;
  intelProductStatus?: IntelligenceStrengthLabel;
}): ProviderCommercialMomentum {
  const intelProduct =
    input.intelProductStatus ??
    trackStatusFromPlanning(input.planning, "commercial_signals", input.planning?.percent ?? 0);

  const signals = collectSignals({
    ...input,
    intelProductStatus: intelProduct,
  });

  const scores: Record<ProviderCommercialMomentumState, number> = {
    early_discovery: scoreEarlyDiscovery(signals),
    observation_ready: scoreObservationReady(signals),
    evaluation_risk: scoreEvaluationRisk(signals),
    adoption_building: scoreAdoptionBuilding(signals),
    expansion_opportunity: scoreExpansionOpportunity(signals),
  };

  const state = pickState(scores);
  return {
    state,
    label: PROVIDER_COMMERCIAL_MOMENTUM_LABELS[state],
    summary: buildSummary(state, signals),
    tone: toneForState(state, signals),
    drivers: buildDrivers(state, signals),
  };
}

export function providerCommercialMomentumChipTone(
  tone: ProviderCommercialMomentumTone,
): "neutral" | "brand" | "success" | "warn" | "muted" {
  if (tone === "opportunity") return "success";
  if (tone === "success") return "success";
  if (tone === "warn") return "warn";
  if (tone === "brand") return "brand";
  return "neutral";
}
