/**
 * Maps AI Debrief Strategy Builder output to the Prepare screen view model.
 */

import type {
  AiDebriefStrategyBuilderFitLevel,
  AiDebriefStrategyBuilderOutput,
  AiDebriefStrategyBuilderPath,
  AiDebriefStrategyBuilderSource,
} from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import type { DebriefCommercialProductCandidate } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import {
  buildCommercialStrategyBriefView,
  type CommercialStrategyBriefView,
  type DebriefPrepareAdvancementPathView,
  type DebriefPrepareCommercialReadinessView,
} from "@/lib/surgical-sales/engagements/buildCommercialStrategyBriefView";
import type { CommercialReadinessFramework } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import {
  commercialReadinessScoreBand,
  commercialReadinessScoreBandLabel,
  COMMERCIAL_READINESS_DIMENSION_LABELS,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import type { DebriefProductKnowledge } from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import type { ProviderObservationNoteEntry } from "@/lib/surgical-sales/engagements/loadProviderObservationNoteCorpus";
import type { DebriefMotionIntelligenceBundle } from "@/lib/surgical-sales/engagements/debriefMotionIntelligenceTypes";
import {
  buildConversionPrepareBriefView,
  type ConversionPrepareBriefView,
} from "@/lib/surgical-sales/engagements/buildConversionPrepareBriefView";

export type {
  DebriefPrepareAdvancementPathView,
  DebriefPrepareCommercialReadinessDimensionView,
  DebriefPrepareCommercialReadinessView,
} from "@/lib/surgical-sales/engagements/buildCommercialStrategyBriefView";

export const DEBRIEF_PREPARE_MISSION_SUCCESS_FALLBACK =
  "Confirm whether the observed patterns match the surgeon's experience and priorities before recommending any commercial next step.";

export const DEBRIEF_PREPARE_ADVANCEMENT_PATHS: AiDebriefStrategyBuilderPath[] = [
  "360 Experience",
  "Case Commitment",
  "No Action",
];

const PATH_COACHING_NOTES: Record<AiDebriefStrategyBuilderPath, string> = {
  "360 Experience":
    "Offer when they see possible workflow value but are not ready for an OR commitment yet.",
  "Case Commitment":
    "Offer only after they confirm the pain is real and want to move forward in the OR.",
  "No Action":
    "Stay here when the workflow is acceptable to them or there is no appetite to change.",
};

export type { ConversionPrepareBriefView } from "@/lib/surgical-sales/engagements/buildConversionPrepareBriefView";

export type DebriefPrepareStrategyView = {
  source: AiDebriefStrategyBuilderSource | "generic";
  frameworkSource: AiDebriefStrategyBuilderSource | "generic";
  commercialStrategyBrief: CommercialStrategyBriefView;
  conversionBrief: ConversionPrepareBriefView;
  commercialReadiness: DebriefPrepareCommercialReadinessView;
  missionWhy: string;
  missionSuccess: string;
  whatWeThinkWeLearned: string[];
  recommendedProductAngle: AiDebriefStrategyBuilderOutput["recommendedProductAngle"] & {
    fitLevelLabel: string;
  };
  conversationStrategy: AiDebriefStrategyBuilderOutput["conversationStrategy"];
  advancementPaths: DebriefPrepareAdvancementPathView[];
  desiredOutcome: string;
};

export function debriefStrategyFitLevelLabel(
  fitLevel: AiDebriefStrategyBuilderFitLevel,
): string {
  switch (fitLevel) {
    case "strong":
      return "Strong fit";
    case "moderate":
      return "Moderate fit";
    case "weak":
      return "Weak fit";
    default:
      return "Not recommended yet";
  }
}

function normalizeLearnedBullets(items: string[]): string[] {
  const unique = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  if (unique.length >= 3) return unique.slice(0, 5);
  if (unique.length > 0) return unique;
  return [
    "Observation detail is still limited — use the debrief to confirm what actually matters to the surgeon.",
    "Focus on workflow moments the surgeon would recognize, not every field note.",
    "You need their read on whether what you saw is worth acting on.",
  ];
}

function buildAdvancementPathsView(
  strategy: AiDebriefStrategyBuilderOutput,
): DebriefPrepareAdvancementPathView[] {
  const recommended = strategy.recommendedAdvancementPath.path;

  return DEBRIEF_PREPARE_ADVANCEMENT_PATHS.map((path) => ({
    path,
    recommended: path === recommended,
    why:
      path === recommended
        ? strategy.recommendedAdvancementPath.why
        : PATH_COACHING_NOTES[path],
  }));
}

function buildCommercialReadinessView(
  framework: CommercialReadinessFramework,
): DebriefPrepareCommercialReadinessView {
  return {
    framework,
    directorSummary: framework.directorSummary,
    primaryCommercialLever: framework.primaryCommercialLever,
    primaryCommercialLeverLabel:
      COMMERCIAL_READINESS_DIMENSION_LABELS[framework.primaryCommercialLever],
    primaryRisk: framework.primaryRisk,
    dimensions: framework.dimensions.map((dimension) => {
      const band = commercialReadinessScoreBand(dimension.score);
      return {
        id: dimension.id,
        label: dimension.label,
        score: dimension.score,
        scoreBand: band,
        scoreBandLabel: commercialReadinessScoreBandLabel(band),
        confidence: dimension.confidence,
        reasoning: dimension.reasoning,
        evidence: dimension.evidence,
        supportingObservations: dimension.supportingObservations,
      };
    }),
  };
}

export function buildDebriefPrepareStrategyView(input: {
  strategy: AiDebriefStrategyBuilderOutput;
  framework: CommercialReadinessFramework;
  source: AiDebriefStrategyBuilderSource | "generic";
  frameworkSource?: AiDebriefStrategyBuilderSource | "generic";
  productCandidates?: DebriefCommercialProductCandidate[];
  productKnowledge?: DebriefProductKnowledge[];
  providerName?: string | null;
  procedureLabel?: string | null;
  completedObservationCount?: number;
  observationCorpus?: ProviderObservationNoteEntry[];
  motionIntelligence?: DebriefMotionIntelligenceBundle;
  organizationName?: string | null;
  competitorSummaries?: string[];
  introWorkflowHints?: string[];
}): DebriefPrepareStrategyView {
  const { strategy, framework, source } = input;
  const frameworkSource = input.frameworkSource ?? source;

  const commercialReadiness = buildCommercialReadinessView(framework);

  const missionWhy = strategy.debriefMission;
  const missionSuccess =
    strategy.primaryHypothesis?.trim() || DEBRIEF_PREPARE_MISSION_SUCCESS_FALLBACK;
  const whatWeThinkWeLearned = normalizeLearnedBullets(strategy.whatWeThinkWeLearned);
  const recommendedProductAngle = {
    ...strategy.recommendedProductAngle,
    fitLevelLabel: debriefStrategyFitLevelLabel(strategy.recommendedProductAngle.fitLevel),
  };
  const conversationStrategy = strategy.conversationStrategy;
  const advancementPaths = buildAdvancementPathsView(strategy);
  const desiredOutcome = strategy.desiredOutcome;

  const commercialStrategyBrief = buildCommercialStrategyBriefView({
    prepareView: {
      missionWhy,
      missionSuccess,
      desiredOutcome,
      whatWeThinkWeLearned,
      recommendedProductAngle: strategy.recommendedProductAngle,
      conversationStrategy,
      advancementPaths,
      commercialReadiness,
    },
    productCandidates: input.productCandidates,
    productKnowledge: input.productKnowledge,
    providerName: input.providerName,
    procedureLabel: input.procedureLabel,
    completedObservationCount: input.completedObservationCount,
    observationCorpus: input.observationCorpus,
    frameworkSource,
    motionIntelligence: input.motionIntelligence,
  });

  const conversionBrief = buildConversionPrepareBriefView({
    commercialStrategyBrief,
    commercialReadiness,
    providerName: input.providerName,
    organizationName: input.organizationName,
    procedureLabel: input.procedureLabel,
    completedObservationCount: input.completedObservationCount,
    competitorSummaries: input.competitorSummaries,
    motionIntelligence: input.motionIntelligence,
    introWorkflowHints: input.introWorkflowHints,
  });

  return {
    source,
    frameworkSource,
    commercialReadiness,
    commercialStrategyBrief,
    conversionBrief,
    missionWhy,
    missionSuccess,
    whatWeThinkWeLearned,
    recommendedProductAngle,
    conversationStrategy,
    advancementPaths,
    desiredOutcome,
  };
}
