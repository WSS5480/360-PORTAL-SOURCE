import { describe, expect, it } from "vitest";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { buildDebriefPrepareStrategyView } from "./buildDebriefPrepareStrategyView";
import { buildDebriefPrepareWorkspaceDraft } from "./buildDebriefPrepareWorkspaceDraft";
import { buildDeterministicCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { debriefCopyContainsBannedPattern } from "./debriefRepFacingCopy";
import { synthesizeDebriefCommercialStrategyFromFramework } from "./synthesizeDebriefCommercialStrategy";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import { planningContentContainsBannedPattern } from "./debriefPrepareIntelligenceValidation";
import {
  JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  JOHN_APPLE_CURRENT_ACTIVITIES,
  JOHN_APPLE_CURRENT_CASE,
  JOHN_APPLE_OBSERVATION_CORPUS,
  JOHN_APPLE_OBSERVATION_NOTES,
  JOHN_APPLE_PRIOR_COMPLETED_CASES,
  JOHN_APPLE_PROVIDER_CONTACT,
} from "./johnAppleCommercialReadiness.fixture";

function buildJohnApplePipeline() {
  const rawObservations = JOHN_APPLE_OBSERVATION_NOTES;

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
    productKnowledge: [getDebriefProductKnowledge("ACSIS")],
  });

  const framework = buildDeterministicCommercialReadinessFramework({
    synthesis,
    plan,
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  });

  const strategy = synthesizeDebriefCommercialStrategyFromFramework({
    synthesis,
    planMode: "intelligence",
    plan,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    providerName: "John Apple",
    framework,
  });

  const view = buildDebriefPrepareStrategyView({
    strategy,
    framework,
    source: "rules_fallback",
    providerName: "John Apple",
    procedureLabel: plan.context.procedureLabel,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    competitorSummaries: synthesis.competitorUsage.map((item) => item.summary),
  });

  const workspaceDraft = buildDebriefPrepareWorkspaceDraft({
    conversionBrief: view.conversionBrief,
    commercialReadiness: view.commercialReadiness,
    commercialSynthesis: synthesis,
    plan,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    competitorSummaries: synthesis.competitorUsage.map((item) => item.summary),
    isFirstDebrief: true,
    providerName: "John Apple",
    procedureLabel: plan.context.procedureLabel,
    observationIntelligence: {
      caseRow: JOHN_APPLE_CURRENT_CASE,
      activities: JOHN_APPLE_CURRENT_ACTIVITIES,
      priorCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
      providerContact: JOHN_APPLE_PROVIDER_CONTACT,
    },
  });

  return {
    plan,
    synthesis,
    commercialReadiness: view.commercialReadiness,
    rawObservations,
    extractedIntelligence: {
      workflowPain: framework.dimensions.find((dimension) => dimension.id === "workflow_pain"),
      competitorUsage: synthesis.competitorUsage,
      learnedBullets: view.whatWeThinkWeLearned,
      productCandidates: synthesis.productCandidates.map((candidate) => candidate.productName),
    },
    planningPage: workspaceDraft,
    briefing: {
      meetingObjective: view.conversionBrief.conversionDecision.primaryQuestion,
      conversionQuestion: view.conversionBrief.header.conversionQuestion,
      crossCasePattern: view.conversionBrief.observationProgramSummary.crossCasePattern,
      incumbentContext: view.conversionBrief.observationProgramSummary.incumbentContext,
      priorityProbes: view.conversionBrief.conversationStrategy.priorityProbes,
      opennessProbes: view.conversionBrief.conversationStrategy.opennessProbes,
      opening: view.conversionBrief.conversationStrategy.opening,
    },
  };
}

describe("debrief prepare intelligence pipeline — John Apple end-to-end", () => {
  it("documents observation → intelligence → planning → briefing without malformed concepts", () => {
    const pipeline = buildJohnApplePipeline();

    expect(pipeline.rawObservations).toHaveLength(5);
    expect(pipeline.rawObservations.join(" ")).toMatch(/Bard Mesh/i);
    expect(pipeline.rawObservations.join(" ")).toMatch(/visualization/i);

    expect(pipeline.extractedIntelligence.competitorUsage.length).toBeGreaterThan(0);
    expect(pipeline.extractedIntelligence.workflowPain?.score ?? 0).toBeGreaterThan(0);

    expect(pipeline.planningPage.meetingObjective).toMatch(/visualization time before fixation/i);
    expect(pipeline.planningPage.meetingObjective).not.toMatch(/visualization-before-fixation/i);
    expect(pipeline.planningPage.knownFacts.some((fact) => /\(\d+ of 5 observations\)/i.test(fact))).toBe(
      true,
    );
    expect(pipeline.planningPage.knownFacts.some((fact) => /Bard Mesh used consistently/i.test(fact))).toBe(
      true,
    );
    expect(
      pipeline.planningPage.knownFacts.some((fact) =>
        /Extra visualization time before fixation|visualization before fixation/i.test(fact),
      ),
    ).toBe(true);
    expect(pipeline.planningPage.whyItMatters).toMatch(/worth validating during the debrief/i);
    expect(pipeline.planningPage.suggestedQuestions.some((q) => /minor annoyance|real cases/i.test(q))).toBe(
      true,
    );
    // Learn items now come from the validated still-need-to-learn pipeline,
    // not the generic confirm-objective pool.
    expect(pipeline.planningPage.suggestedLearnItems.length).toBeGreaterThan(0);
    expect(
      pipeline.planningPage.suggestedLearnItems.some((item) => /surgeon's perspective/i.test(item)),
    ).toBe(false);
    expect(pipeline.planningPage.knownFacts.join(" ")).not.toMatch(/observation access approved/i);
    expect(pipeline.planningPage.knownFacts.join(" ")).not.toMatch(/scheduler identified/i);

    expect(pipeline.planningPage.suggestedQuestions.length).toBeGreaterThan(0);
    expect(pipeline.planningPage.suggestedQuestions.length).toBeLessThanOrEqual(5);

    expect(pipeline.briefing.crossCasePattern).toMatch(/visualization|fixation|workflow/i);
    expect(pipeline.briefing.incumbentContext).toMatch(/Bard Mesh/i);

    const planningBlob = JSON.stringify(pipeline.planningPage);
    const briefingBlob = JSON.stringify(pipeline.briefing);

    expect(debriefCopyContainsBannedPattern(planningBlob)).toBe(false);
    expect(debriefCopyContainsBannedPattern(briefingBlob)).toBe(false);
    expect(planningContentContainsBannedPattern(pipeline.planningPage)).toBe(false);

    expect(planningBlob).not.toMatch(/apple product used surgery/i);
    expect(planningBlob).not.toMatch(/apple product has been your consistent choice/i);
    expect(briefingBlob).not.toMatch(/apple product used surgery/i);
    expect(briefingBlob).not.toMatch(/apple product has been your consistent choice/i);

    // Trace artifact for manual verification during development.
    expect({
      rawObservations: pipeline.rawObservations,
      extractedIntelligence: pipeline.extractedIntelligence,
      planningPage: pipeline.planningPage,
      briefing: pipeline.briefing,
    }).toMatchObject({
      rawObservations: expect.any(Array),
      extractedIntelligence: expect.any(Object),
      planningPage: expect.any(Object),
      briefing: expect.any(Object),
    });
  });

  it("rejects injected ontology junk at the planning layer", () => {
    const pipeline = buildJohnApplePipeline();
    const poisonedBrief = {
      ...pipeline.briefing,
      ...pipeline.planningPage,
      reference: {
        learnedBullets: ["Apple Product Used Surgery observed"],
        observationReferences: [{ excerpt: "Apple Product Used Surgery observed", observationIndex: 1 }],
        commercialReadiness: { dimensions: [] },
      },
      conversionDecision: {
        primaryQuestion: "Does apple product used surgery observed matter?",
        subtitle: "",
        notDecidingToday: [],
        successOutcomes: [],
        decisionHelper: "",
      },
      conversationStrategy: {
        priorityProbes: ["Does Apple Product Used Surgery observed match your experience?"],
        opennessProbes: ["Apple Product has been your consistent choice on these cases — still true?"],
        opening: "",
        closingQuestion: "",
        subtitle: "",
        toneCue: null,
      },
      observationProgramSummary: {
        programFacts: [],
        subtitle: "",
        crossCasePattern: "",
        crossCaseProofBullets: [],
        incumbentContext: null,
        introCallContract: null,
      },
      operationalConsiderations: [],
      header: { kicker: "", conversionQuestion: "" },
      nextMotionPaths: [],
      conditionalProducts: [],
      conditionalProductsLabel: "",
    };

    const poisonedDraft = buildDebriefPrepareWorkspaceDraft({
      conversionBrief: poisonedBrief as never,
      commercialReadiness: pipeline.commercialReadiness,
      commercialSynthesis: pipeline.synthesis,
      plan: pipeline.plan,
      completedObservationCount: 5,
      providerName: "John Apple",
      observationIntelligence: {
        caseRow: JOHN_APPLE_CURRENT_CASE,
        activities: JOHN_APPLE_CURRENT_ACTIVITIES,
        priorCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
        providerContact: JOHN_APPLE_PROVIDER_CONTACT,
      },
    });

    expect(JSON.stringify(poisonedDraft)).not.toMatch(/apple product used surgery/i);
    expect(JSON.stringify(poisonedDraft)).not.toMatch(/apple product has been your consistent choice/i);
    expect(poisonedDraft.meetingObjective).toMatch(/visualization time before fixation|workflow pattern/i);
    expect(poisonedDraft.meetingObjective).not.toMatch(/visualization-before-fixation/i);
  });
});
