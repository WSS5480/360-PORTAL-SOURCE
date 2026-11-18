import { describe, expect, it } from "vitest";
import { buildStrategyIntelligenceConsumptionAudit } from "./buildStrategyIntelligenceConsumptionAudit";
import {
  extractDiscoveryContactFacts,
  extractEvaluationEngagementFacts,
  extractIntroCallFacts,
  extractObservationCaseFacts,
  extractObservationNoteFacts,
  extractOrganizationFacts,
  extractProviderDebriefFacts,
  extractProviderProfileFacts,
  resetProviderIntelligenceFactCounter,
  sortTimelineFacts,
} from "./extractProviderIntelligenceFacts";
import type { ProviderIntelligenceAggregatorResult } from "./providerIntelligenceAggregatorTypes";
import { buildDebriefCommercialSynthesis } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import { buildProviderDebriefPlan } from "@/lib/surgical-sales/engagements/buildProviderDebriefPlan";
import { EMPTY_PROVIDER_INTELLIGENCE_CONTEXT } from "@/lib/surgical-sales/engagements/providerIntelligenceContext";
import { getDebriefProductKnowledge } from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import {
  JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  JOHN_APPLE_CURRENT_ACTIVITIES,
  JOHN_APPLE_CURRENT_CASE,
  JOHN_APPLE_OBSERVATION_CORPUS,
  JOHN_APPLE_OBSERVATION_NOTES,
  JOHN_APPLE_PRIOR_COMPLETED_CASES,
  JOHN_APPLE_PROVIDER_CONTACT,
} from "@/lib/surgical-sales/engagements/johnAppleCommercialReadiness.fixture";

function buildJohnAppleAggregator(): ProviderIntelligenceAggregatorResult {
  resetProviderIntelligenceFactCounter();

  const contact = JOHN_APPLE_PROVIDER_CONTACT as Record<string, unknown>;
  const cases = [JOHN_APPLE_CURRENT_CASE, ...JOHN_APPLE_PRIOR_COMPLETED_CASES] as Array<
    Record<string, unknown>
  >;

  const timeline = sortTimelineFacts([
    ...extractDiscoveryContactFacts(contact),
    ...extractObservationCaseFacts(cases),
    ...extractObservationNoteFacts(JOHN_APPLE_OBSERVATION_CORPUS),
    ...extractProviderProfileFacts(contact, "provider-apple"),
    ...extractIntroCallFacts([]),
    ...extractProviderDebriefFacts([]),
    ...extractEvaluationEngagementFacts([]),
    ...extractOrganizationFacts({
      organizationId: null,
      organizationName: null,
      accountIntelligence: null,
    }),
  ]);

  const sourceBuckets = [
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
  ].map((sourceType) => {
    const matching = timeline.filter((fact) => fact.sourceType === sourceType);
    return {
      sourceType,
      loadedCount: matching.length,
      ignoredCount: 0,
      factIds: matching.map((fact) => fact.id),
    };
  });

  return {
    providerId: "provider-apple",
    salesRepId: "rep-1",
    assembledAt: new Date().toISOString(),
    organizationId: null,
    organizationName: null,
    timeline,
    sourceBuckets,
    totalFacts: timeline.length,
  };
}

describe("Provider Intelligence Context Aggregator", () => {
  it("builds a chronological timeline with required fact metadata", () => {
    const aggregator = buildJohnAppleAggregator();

    expect(aggregator.totalFacts).toBeGreaterThan(0);
    expect(aggregator.timeline.length).toBe(aggregator.totalFacts);

    for (const fact of aggregator.timeline) {
      expect(fact.sourceType).toBeTruthy();
      expect(fact.category).toBeTruthy();
      expect(fact.confidence).toMatch(/high|medium|low/);
      expect(fact.label).toBeTruthy();
      expect(fact.excerpt.length).toBeGreaterThan(3);
    }

    const observationNotes = aggregator.timeline.filter(
      (fact) => fact.sourceType === "observation_note",
    );
    expect(observationNotes).toHaveLength(5);
    expect(observationNotes.some((fact) => fact.excerpt.includes("visualization"))).toBe(true);
  });

  it("includes discovery, observation, and provider profile source buckets for John Apple", () => {
    const aggregator = buildJohnAppleAggregator();
    const bucketMap = Object.fromEntries(
      aggregator.sourceBuckets.map((bucket) => [bucket.sourceType, bucket.loadedCount]),
    );

    expect(bucketMap.discovery_contact).toBeGreaterThan(0);
    expect(bucketMap.observation_case).toBeGreaterThan(0);
    expect(bucketMap.observation_note).toBe(5);
    expect(bucketMap.provider_profile).toBeGreaterThan(0);
  });

  it("produces strategy consumption audit with loaded vs ignored vs scoring vs recommendations", () => {
    const aggregator = buildJohnAppleAggregator();
    const plan = buildProviderDebriefPlan({
      caseRow: JOHN_APPLE_CURRENT_CASE,
      activities: JOHN_APPLE_CURRENT_ACTIVITIES,
      providerName: "John Apple",
      priorObservationCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
      providerContact: JOHN_APPLE_PROVIDER_CONTACT,
    });
    const synthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "John Apple",
      organizationName: null,
      completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
      pathwayStageLabel: "Debrief",
      observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
      productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    });

    const audit = buildStrategyIntelligenceConsumptionAudit({
      aggregator,
      engagementId: "eng-apple-debrief",
      context: {
        engagementId: "eng-apple-debrief",
        providerName: "John Apple",
        organizationName: null,
        completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
        planMode: "intelligence",
        pathwayStageId: "debrief",
        pathwayStageLabel: "Debrief",
        procedureLabel: plan.context.procedureLabel,
        observationMission: plan.context.observationMission,
        observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
        observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
        providerIntelligence: EMPTY_PROVIDER_INTELLIGENCE_CONTEXT,
        extractedFindings: [],
        whatWeKnow: [],
        stillNeedToLearn: synthesis.validationNeeds.map((item) => item.question),
        commercialSynthesis: synthesis,
        productKnowledge: [getDebriefProductKnowledge("ACSIS")],
        plan,
        intelligenceAggregator: aggregator,
      },
    });

    expect(audit.loaded.length).toBeGreaterThan(0);
    expect(audit.strategyEngineExposure.aggregatorAttachedToContext).toBe(true);
    expect(audit.strategyEngineExposure.timelineFactCount).toBe(aggregator.totalFacts);
    expect(audit.usedInScoring.length).toBeGreaterThan(0);
    expect(audit.ignored.length).toBeGreaterThanOrEqual(0);
    expect(audit.strategyEngineExposure.sourceTypesNotYetConsumed).toContain("intro_call");
    expect(audit.strategyEngineExposure.sourceTypesNotYetConsumed).toContain(
      "organization_account",
    );
    expect(audit.strategyEngineExposure.sourceTypesConsumedByScoring).toContain(
      "observation_note",
    );
  });
});
