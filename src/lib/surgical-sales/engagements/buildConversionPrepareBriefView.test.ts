import { describe, expect, it } from "vitest";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { buildDebriefPrepareStrategyView } from "./buildDebriefPrepareStrategyView";
import { buildDeterministicCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { synthesizeDebriefCommercialStrategyFromFramework } from "./synthesizeDebriefCommercialStrategy";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import {
  isDebriefDiscoveryLeakageQuestion,
} from "./debriefConversionCoaching";
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
  buildJohnAppleMotionIntelligenceContextStub,
  JOHN_APPLE_INTRO_CALL_DATE,
} from "./johnAppleMotionIntelligence.fixture";
import { buildDebriefMotionIntelligenceFromContext } from "./buildDebriefMotionIntelligence";
import { applyDebriefMotionIntelligenceToStrategy } from "./applyDebriefMotionIntelligence";

function buildJohnAppleConversionView() {
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
    organizationName: "Test Hospital",
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

  const motionContext = buildJohnAppleMotionIntelligenceContextStub({
    commercialSynthesis: synthesis,
    plan,
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    planMode: "intelligence",
    providerName: "John Apple",
  });

  const motionBundle = buildDebriefMotionIntelligenceFromContext({
    engagementId: "debrief-eng-1",
    providerName: "John Apple",
    organizationName: "Test Hospital",
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    planMode: "intelligence",
    pathwayStageId: "debrief",
    pathwayStageLabel: "Debrief",
    procedureLabel: plan.context.procedureLabel,
    observationMission: plan.context.observationMission,
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    providerIntelligence: motionContext.providerIntelligence,
    extractedFindings: [],
    whatWeKnow: [],
    stillNeedToLearn: [],
    commercialSynthesis: synthesis,
    productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    plan,
    intelligenceAggregator: motionContext.intelligenceAggregator,
    intelligenceAudit: motionContext.intelligenceAudit,
  });

  const motion = {
    ...motionBundle,
    priorDebrief: [],
  };

  const strategy = applyDebriefMotionIntelligenceToStrategy(baseStrategy, motion);

  return buildDebriefPrepareStrategyView({
    strategy,
    framework,
    source: "rules_fallback",
    frameworkSource: "rules_fallback",
    productCandidates: synthesis.productCandidates,
    productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    providerName: "John Apple",
    organizationName: "Test Hospital",
    procedureLabel: plan.context.procedureLabel,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    motionIntelligence: motion,
    competitorSummaries: synthesis.competitorUsage.map((item) => item.summary),
    introWorkflowHints: [
      ...synthesis.providerHistory,
      plan.context.observationMission ?? "",
    ].filter(Boolean),
  });
}

describe("buildConversionPrepareBriefView", () => {
  it("exposes conversion-stage sections on the prepare view", () => {
    const view = buildJohnAppleConversionView();
    const brief = view.conversionBrief;

    expect(brief.header.kicker).toMatch(/first debrief/i);
    expect(brief.header.conversionQuestion).toMatch(/visualization time before fixation|matters enough to act on/i);
    expect(brief.observationProgramSummary.programFacts.length).toBeGreaterThanOrEqual(3);
    expect(brief.conversionDecision.notDecidingToday).toContain("Lead with product");
    expect(brief.conversationStrategy.priorityProbes.length).toBeGreaterThan(0);
    expect(brief.nextMotionPaths).toHaveLength(3);
    expect(brief.nextMotionPaths.map((path) => path.path)).toEqual([
      "No Action",
      "360 Experience",
      "Case Commitment",
    ]);
    expect(brief.nextMotionPaths.every((path) => !("recommended" in path))).toBe(true);
    expect(brief.operationalConsiderations.some((row) => /scheduler/i.test(row.consideration))).toBe(
      true,
    );
  });

  it("uses program-language opening and filters discovery leakage from probes", () => {
    const view = buildJohnAppleConversionView();
    const conversation = view.conversionBrief.conversationStrategy;

    expect(conversation.opening).toMatch(/5 Robotic ventral hernia cases/i);
    expect(conversation.opening).toMatch(/view before.*fixation|visualization before fixation/i);
    expect(conversation.opening).toMatch(/rise to the level/i);
    expect(conversation.closingQuestion).not.toMatch(/case commitment feel like the right/i);

    for (const question of [
      ...conversation.priorityProbes,
      ...conversation.opennessProbes,
    ]) {
      expect(isDebriefDiscoveryLeakageQuestion(question, { isFirstDebrief: true })).toBe(false);
    }
  });

  it("surfaces Karen, Bard Mesh, and intro-call contract for John Apple", () => {
    const view = buildJohnAppleConversionView();
    const summary = view.conversionBrief.observationProgramSummary;

    expect(
      summary.programFacts.some((fact) => fact.label === "Scheduler" && /Karen/i.test(fact.value)),
    ).toBe(true);
    expect(summary.incumbentContext).toMatch(/Bard Mesh/i);
    expect(summary.introCallContract).toMatch(/intro call/i);
    expect(summary.introCallContract).toMatch(/workflow in the OR before discussing product|before product talk/i);
  });

  it("keeps product positioning conditional and collapsed-ready", () => {
    const view = buildJohnAppleConversionView();
    const brief = view.conversionBrief;

    expect(brief.conditionalProductsLabel).toMatch(/agrees the observed issue is worth addressing/i);
    const acsis = brief.conditionalProducts.find((product) => product.displayName === "ACSIS");
    expect(acsis).toBeDefined();
    expect(brief.reference.commercialReadiness.dimensions).toHaveLength(6);
  });
});
