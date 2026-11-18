/**
 * Maps aggregated provider intelligence against what the debrief strategy engine
 * currently loads, ignores, and consumes for scoring vs recommendations.
 */

import type { AiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";
import type {
  IntelligenceAuditEntry,
  ProviderIntelligenceAggregatorResult,
  ProviderIntelligenceAuditReport,
  ProviderIntelligenceFact,
  ProviderIntelligenceSourceType,
  StrategyEngineExposureReport,
} from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorTypes";

const SCORING_SOURCE_TYPES = new Set<ProviderIntelligenceSourceType>([
  "observation_case",
  "observation_note",
  "provider_profile",
  "discovery_contact",
  "provider_debrief",
]);

const RECOMMENDATION_SOURCE_TYPES = new Set<ProviderIntelligenceSourceType>([
  "observation_case",
  "observation_note",
  "provider_profile",
  "discovery_contact",
  "provider_debrief",
  "evaluation_engagement",
  "evaluation_outcome",
]);

const ALL_SOURCE_TYPES: ProviderIntelligenceSourceType[] = [
  "discovery_contact",
  "discovery_engagement",
  "intro_call",
  "observation_case",
  "observation_note",
  "provider_debrief",
  "debrief_visit",
  "evaluation_engagement",
  "evaluation_outcome",
  "provider_profile",
  "organization_account",
];

function toAuditEntry(
  fact: ProviderIntelligenceFact,
  reason: string,
): IntelligenceAuditEntry {
  return {
    factId: fact.id,
    sourceType: fact.sourceType,
    sourceEngagementId: fact.sourceEngagementId,
    sourceEngagementType: fact.sourceEngagementType,
    date: fact.date,
    category: fact.category,
    label: fact.label,
    excerpt: fact.excerpt,
    reason,
  };
}

function collectContextEvidenceStrings(
  context: Omit<AiDebriefStrategyBuilderContext, "intelligenceAudit">,
): string[] {
  const strings: string[] = [];

  strings.push(...context.observationNotes);
  strings.push(context.procedureLabel ?? "");
  strings.push(context.observationMission ?? "");
  strings.push(context.pathwayStageLabel ?? "");

  for (const learning of context.plan.whatWeLearned) {
    strings.push(learning.signal);
    if (learning.evidence) strings.push(learning.evidence);
  }

  for (const candidate of context.commercialSynthesis.productCandidates) {
    strings.push(...candidate.observationLinkedRationale);
  }

  for (const finding of context.commercialSynthesis.findings) {
    strings.push(finding.narrative);
    if (finding.evidenceExcerpt) strings.push(finding.evidenceExcerpt);
  }

  for (const pattern of context.commercialSynthesis.recurringPatterns) {
    strings.push(pattern.pattern);
  }

  const prep = context.providerIntelligence.preObservationPrep;
  strings.push(
    prep.impactOpeningStatement ?? "",
    prep.probes ?? "",
    prep.valueHypothesis ?? "",
    prep.plannedClose ?? "",
    prep.additionalNotes ?? "",
  );

  if (context.providerIntelligence.introCallSummary?.snapshotSummary) {
    strings.push(context.providerIntelligence.introCallSummary.snapshotSummary);
  }

  return strings.map((item) => item.trim().toLowerCase()).filter((item) => item.length >= 8);
}

function factMatchesContextEvidence(
  fact: ProviderIntelligenceFact,
  evidence: string[],
): boolean {
  const excerpt = fact.excerpt.trim().toLowerCase();
  if (!excerpt) return false;

  if (evidence.some((item) => item.includes(excerpt.slice(0, 48)) || excerpt.includes(item.slice(0, 48)))) {
    return true;
  }

  if (fact.fieldKey) {
    const field = fact.fieldKey.toLowerCase();
    if (
      evidence.some((item) => item.includes(field.replace(/^provider_/, "").replace(/_/g, " ")))
    ) {
      return true;
    }
  }

  return false;
}

function factLoadedByStrategyPath(fact: ProviderIntelligenceFact): boolean {
  switch (fact.sourceType) {
    case "observation_note":
    case "observation_case":
    case "provider_profile":
    case "discovery_contact":
    case "provider_debrief":
      return true;
    case "intro_call":
      return Boolean(fact.sourceEngagementType === "intro_call");
    default:
      return false;
  }
}

function buildStrategyExposure(
  context: Omit<AiDebriefStrategyBuilderContext, "intelligenceAudit">,
  aggregator: ProviderIntelligenceAggregatorResult,
): StrategyEngineExposureReport {
  const consumedByScoring = ALL_SOURCE_TYPES.filter((type) => SCORING_SOURCE_TYPES.has(type));
  const consumedByRecommendations = ALL_SOURCE_TYPES.filter((type) =>
    RECOMMENDATION_SOURCE_TYPES.has(type),
  );
  const notYetConsumed = ALL_SOURCE_TYPES.filter(
    (type) => !SCORING_SOURCE_TYPES.has(type) && !RECOMMENDATION_SOURCE_TYPES.has(type),
  );

  return {
    aggregatorAttachedToContext: true,
    timelineFactCount: aggregator.totalFacts,
    fieldsPassedToPhase1Prompt: [
      "commercialSynthesis (findings, patterns, notes, validation, products)",
      "plan.whatWeLearned",
      "providerIntelligence.preObservationPrep",
      "providerIntelligence.introCallSummary",
    ],
    fieldsPassedToCommercialSynthesis: [
      "plan.whatWeLearned",
      "plan.productOpportunityAssessment",
      "plan.longitudinalIntelligence",
      "observationNotes",
      "pathwayStageLabel",
      "completedObservationCount",
    ],
    sourceTypesConsumedByScoring: consumedByScoring,
    sourceTypesConsumedByRecommendations: consumedByRecommendations,
    sourceTypesNotYetConsumed: notYetConsumed,
  };
}

export function buildStrategyIntelligenceConsumptionAudit(input: {
  aggregator: ProviderIntelligenceAggregatorResult;
  context: Omit<AiDebriefStrategyBuilderContext, "intelligenceAudit">;
  engagementId?: string | null;
}): ProviderIntelligenceAuditReport {
  const { aggregator, context } = input;
  const evidence = collectContextEvidenceStrings(context);

  const loaded: IntelligenceAuditEntry[] = [];
  const ignored: IntelligenceAuditEntry[] = [];
  const usedInScoring: IntelligenceAuditEntry[] = [];
  const usedInRecommendations: IntelligenceAuditEntry[] = [];

  for (const fact of aggregator.timeline) {
    const onStrategyPath = factLoadedByStrategyPath(fact);
    const matchesEvidence = factMatchesContextEvidence(fact, evidence);
    const scoringRelevant = SCORING_SOURCE_TYPES.has(fact.sourceType) && (onStrategyPath || matchesEvidence);
    const recommendationRelevant =
      RECOMMENDATION_SOURCE_TYPES.has(fact.sourceType) && (onStrategyPath || matchesEvidence);

    if (onStrategyPath || matchesEvidence) {
      loaded.push(
        toAuditEntry(
          fact,
          onStrategyPath
            ? "Loaded on debrief strategy path"
            : "Matched evidence in strategy context",
        ),
      );
    } else {
      ignored.push(
        toAuditEntry(
          fact,
          "Aggregated but not yet consumed by debrief strategy engine",
        ),
      );
    }

    if (scoringRelevant) {
      usedInScoring.push(
        toAuditEntry(fact, "Contributes to plan, synthesis, or framework scoring inputs"),
      );
    }

    if (recommendationRelevant) {
      usedInRecommendations.push(
        toAuditEntry(
          fact,
          "Contributes to product candidates, advancement path, or conversation coaching inputs",
        ),
      );
    }
  }

  const buckets = aggregator.sourceBuckets.map((bucket) => {
    const ignoredCount = ignored.filter((entry) => entry.sourceType === bucket.sourceType).length;
    return {
      ...bucket,
      ignoredCount,
    };
  });

  return {
    assembledAt: aggregator.assembledAt,
    providerId: aggregator.providerId,
    salesRepId: aggregator.salesRepId,
    engagementId: input.engagementId ?? null,
    loaded,
    ignored,
    usedInScoring,
    usedInRecommendations,
    strategyEngineExposure: buildStrategyExposure(context, aggregator),
    aggregator: {
      ...aggregator,
      sourceBuckets: buckets,
    },
  };
}
