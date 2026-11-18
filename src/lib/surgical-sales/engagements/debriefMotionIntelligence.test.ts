import { describe, expect, it } from "vitest";
import { applyDebriefMotionIntelligenceToStrategy } from "./applyDebriefMotionIntelligence";
import { buildDebriefMotionIntelligenceFromContext } from "./buildDebriefMotionIntelligence";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { buildDebriefPrepareStrategyView } from "./buildDebriefPrepareStrategyView";
import { buildDeterministicCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { synthesizeDebriefCommercialStrategyFromFramework } from "./synthesizeDebriefCommercialStrategy";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import {
  JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  JOHN_APPLE_CURRENT_ACTIVITIES,
  JOHN_APPLE_CURRENT_CASE,
  JOHN_APPLE_OBSERVATION_CORPUS,
  JOHN_APPLE_OBSERVATION_NOTES,
  JOHN_APPLE_PRIOR_COMPLETED_CASES,
  JOHN_APPLE_PROVIDER_CONTACT,
} from "./johnAppleCommercialReadiness.fixture";
import {
  JOHN_APPLE_CONTACT_ACCESS_PATH,
  JOHN_APPLE_CURRENT_DEBRIEF_ENGAGEMENT_ID,
  JOHN_APPLE_INTRO_CALL_DATE,
  JOHN_APPLE_INTRO_CALL_SCHEDULING,
  JOHN_APPLE_PRIOR_DEBRIEF_COMMITMENT,
  JOHN_APPLE_PRIOR_DEBRIEF_DATE,
  buildJohnAppleMotionIntelligenceContextStub,
} from "./johnAppleMotionIntelligence.fixture";
import type { AiDebriefStrategyBuilderContext } from "./loadAiDebriefStrategyBuilderContext";
import { EMPTY_PROVIDER_INTELLIGENCE_CONTEXT } from "./providerIntelligenceContext";
import type { ProviderIntelligenceAggregatorResult } from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorTypes";

function buildJohnAppleBasePipeline() {
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
    productKnowledge: [
      getDebriefProductKnowledge("ACSIS"),
      getDebriefProductKnowledge("Endolumik"),
    ],
  });

  const framework = buildDeterministicCommercialReadinessFramework({
    synthesis,
    plan,
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  });

  const baseStrategy = synthesizeDebriefCommercialStrategyFromFramework({
    synthesis,
    planMode: "intelligence",
    plan,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    providerName: "John Apple",
    framework,
  });

  return { plan, synthesis, framework, baseStrategy };
}

function buildJohnAppleMotionContext(
  base: ReturnType<typeof buildJohnAppleBasePipeline>,
): AiDebriefStrategyBuilderContext {
  const motionStub = buildJohnAppleMotionIntelligenceContextStub({
    commercialSynthesis: base.synthesis,
    plan: base.plan,
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    productKnowledge: [
      getDebriefProductKnowledge("ACSIS"),
      getDebriefProductKnowledge("Endolumik"),
    ],
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    planMode: "intelligence",
    providerName: "John Apple",
  });

  return {
    engagementId: JOHN_APPLE_CURRENT_DEBRIEF_ENGAGEMENT_ID,
    providerName: "John Apple",
    organizationName: null,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    planMode: "intelligence",
    pathwayStageId: "debrief",
    pathwayStageLabel: "Debrief",
    procedureLabel: base.plan.context.procedureLabel,
    observationMission: base.plan.context.observationMission,
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    providerIntelligence: motionStub.providerIntelligence,
    extractedFindings: [],
    whatWeKnow: [],
    stillNeedToLearn: [],
    commercialSynthesis: base.synthesis,
    productKnowledge: [
      getDebriefProductKnowledge("ACSIS"),
      getDebriefProductKnowledge("Endolumik"),
    ],
    plan: base.plan,
    intelligenceAggregator: motionStub.intelligenceAggregator,
    intelligenceAudit: {
      assembledAt: "2026-06-09T00:00:00.000Z",
      providerId: "provider-apple",
      salesRepId: "rep-1",
      engagementId: JOHN_APPLE_CURRENT_DEBRIEF_ENGAGEMENT_ID,
      loaded: [],
      ignored: [],
      usedInScoring: [],
      usedInRecommendations: [],
      strategyEngineExposure: {
        aggregatorAttachedToContext: true,
        timelineFactCount: motionStub.intelligenceAggregator.totalFacts,
        fieldsPassedToPhase1Prompt: [],
        fieldsPassedToCommercialSynthesis: [],
        sourceTypesConsumedByScoring: [],
        sourceTypesConsumedByRecommendations: [],
        sourceTypesNotYetConsumed: [],
      },
      aggregator: motionStub.intelligenceAggregator,
    },
  };
}

describe("debrief motion intelligence wiring", () => {
  it("extracts prior debrief, intro call, and contact scheduling from context", () => {
    const base = buildJohnAppleBasePipeline();
    const context = buildJohnAppleMotionContext(base);
    const motion = buildDebriefMotionIntelligenceFromContext(context);

    expect(motion.priorDebrief).toHaveLength(1);
    expect(motion.priorDebrief[0]?.excerpt).toBe(JOHN_APPLE_PRIOR_DEBRIEF_COMMITMENT);
    expect(motion.priorDebrief[0]?.date).toBe(JOHN_APPLE_PRIOR_DEBRIEF_DATE);

    expect(motion.introCall.length).toBeGreaterThan(0);
    expect(
      motion.introCall.some((item) => item.excerpt.includes("Karen controls scheduling")),
    ).toBe(true);
    expect(motion.introCall[0]?.date).toBe(JOHN_APPLE_INTRO_CALL_DATE);

    expect(motion.contactScheduling).toHaveLength(1);
    expect(motion.contactScheduling[0]?.excerpt).toBe(JOHN_APPLE_CONTACT_ACCESS_PATH);
  });

  it("enriches conversation plan and advancement path without changing framework scores", () => {
    const base = buildJohnAppleBasePipeline();
    const context = buildJohnAppleMotionContext(base);
    const motion = buildDebriefMotionIntelligenceFromContext(context);

    const enrichedStrategy = applyDebriefMotionIntelligenceToStrategy(
      base.baseStrategy,
      motion,
    );

    const baselineView = buildDebriefPrepareStrategyView({
      strategy: base.baseStrategy,
      framework: base.framework,
      source: "rules_fallback",
      frameworkSource: "rules_fallback",
      productCandidates: base.synthesis.productCandidates,
      providerName: "John Apple",
      observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    });

    const enrichedView = buildDebriefPrepareStrategyView({
      strategy: enrichedStrategy,
      framework: base.framework,
      source: "rules_fallback",
      frameworkSource: "rules_fallback",
      productCandidates: base.synthesis.productCandidates,
      providerName: "John Apple",
      observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
      motionIntelligence: motion,
    });

    expect(enrichedView.commercialReadiness).toEqual(baselineView.commercialReadiness);
    expect(enrichedView.commercialStrategyBrief.productOpportunities).toEqual(
      baselineView.commercialStrategyBrief.productOpportunities,
    );

    const conversation = enrichedView.commercialStrategyBrief.conversationPlan;
    expect(
      conversation.validateObservation.some((question) =>
        question.includes(JOHN_APPLE_PRIOR_DEBRIEF_COMMITMENT),
      ),
    ).toBe(true);
    expect(
      conversation.exploreOpenness.some((question) => question.toLowerCase().includes("karen")),
    ).toBe(true);
    expect(conversation.closingQuestion.toLowerCase()).toContain("karen");

    const recommended = enrichedView.commercialStrategyBrief.advancementPaths.find(
      (path) => path.recommended,
    );
    expect(recommended?.why).toContain(JOHN_APPLE_PRIOR_DEBRIEF_COMMITMENT);
    expect(recommended?.why.toLowerCase()).toContain("karen");
    expect(recommended?.attributions?.length).toBeGreaterThan(0);

    expect(enrichedView.commercialStrategyBrief.executiveBrief).toContain(
      JOHN_APPLE_PRIOR_DEBRIEF_COMMITMENT,
    );

    const motionRefs =
      enrichedView.commercialStrategyBrief.supportingEvidence.motionIntelligenceReferences;
    expect(motionRefs?.length).toBeGreaterThan(0);
    expect(
      motionRefs?.some((ref) =>
        ref.attributions.some(
          (attr) =>
            attr.kind === "intro_call_intel" &&
            attr.label.includes("Intro Call") &&
            attr.label.includes(JOHN_APPLE_INTRO_CALL_DATE),
        ),
      ),
    ).toBe(true);
    expect(
      motionRefs?.some((ref) =>
        ref.attributions.some(
          (attr) =>
            attr.kind === "prior_provider_debrief" &&
            attr.label.includes("Provider Debrief") &&
            attr.label.includes(JOHN_APPLE_PRIOR_DEBRIEF_DATE),
        ),
      ),
    ).toBe(true);
  });

  it("leaves strategy unchanged when motion intelligence is empty", () => {
    const base = buildJohnAppleBasePipeline();
    const emptyAggregator: ProviderIntelligenceAggregatorResult = {
      providerId: "provider-apple",
      salesRepId: "rep-1",
      assembledAt: "2026-06-09T00:00:00.000Z",
      organizationId: null,
      organizationName: null,
      timeline: [],
      sourceBuckets: [],
      totalFacts: 0,
    };

    const context: AiDebriefStrategyBuilderContext = {
      engagementId: JOHN_APPLE_CURRENT_DEBRIEF_ENGAGEMENT_ID,
      providerName: "John Apple",
      organizationName: null,
      completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
      planMode: "intelligence",
      pathwayStageId: "debrief",
      pathwayStageLabel: "Debrief",
      procedureLabel: base.plan.context.procedureLabel,
      observationMission: base.plan.context.observationMission,
      observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
      observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
      providerIntelligence: EMPTY_PROVIDER_INTELLIGENCE_CONTEXT,
      extractedFindings: [],
      whatWeKnow: [],
      stillNeedToLearn: [],
      commercialSynthesis: base.synthesis,
      productKnowledge: [getDebriefProductKnowledge("ACSIS")],
      plan: base.plan,
      intelligenceAggregator: emptyAggregator,
      intelligenceAudit: {
        assembledAt: "2026-06-09T00:00:00.000Z",
        providerId: "provider-apple",
        salesRepId: "rep-1",
        engagementId: JOHN_APPLE_CURRENT_DEBRIEF_ENGAGEMENT_ID,
        loaded: [],
        ignored: [],
        usedInScoring: [],
        usedInRecommendations: [],
        strategyEngineExposure: {
          aggregatorAttachedToContext: true,
          timelineFactCount: 0,
          fieldsPassedToPhase1Prompt: [],
          fieldsPassedToCommercialSynthesis: [],
          sourceTypesConsumedByScoring: [],
          sourceTypesConsumedByRecommendations: [],
          sourceTypesNotYetConsumed: [],
        },
        aggregator: emptyAggregator,
      },
    };

    const motion = buildDebriefMotionIntelligenceFromContext(context);
    const enriched = applyDebriefMotionIntelligenceToStrategy(base.baseStrategy, motion);

    expect(enriched).toEqual(base.baseStrategy);
  });
});
