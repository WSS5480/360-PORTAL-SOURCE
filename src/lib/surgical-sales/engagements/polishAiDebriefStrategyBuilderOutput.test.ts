import { describe, expect, it } from "vitest";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import { containsInternalCategoryLabel } from "./debriefClinicalTopicTranslation";
import { debriefCopyContainsBannedPattern } from "./debriefRepFacingCopy";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import type { AiDebriefStrategyBuilderContext } from "./loadAiDebriefStrategyBuilderContext";
import {
  EMPTY_PROVIDER_INTELLIGENCE_AGGREGATOR,
  EMPTY_PROVIDER_INTELLIGENCE_AUDIT,
} from "@/lib/surgical-sales/intelligence";
import { EMPTY_PROVIDER_INTELLIGENCE_CONTEXT } from "./providerIntelligenceContext";
import type { AiDebriefStrategyBuilderOutput } from "./aiDebriefStrategyBuilderTypes";
import {
  buildRulesFallbackAiDebriefStrategy,
} from "./generateAiDebriefStrategyBuilder";
import {
  canonicalDebriefProductName,
  isBareDebriefLabel,
  isCompleteRepFacingSentence,
  polishAiDebriefStrategyBuilderOutput,
  sanitizeAiDebriefStrategyBuilderOutput,
} from "./polishAiDebriefStrategyBuilderOutput";

const RICH_CASE = {
  id: "case-1",
  surgeon_contact_id: "provider-1",
  procedure_type: "Robotic ventral hernia",
  case_date: "2026-05-28",
  live_observation_clinical_pain_points: "Visualization before fixation creates uncertainty",
  live_observation_product_fit: "Possible",
};

function buildTestContext(): AiDebriefStrategyBuilderContext {
  const plan = buildProviderDebriefPlan({
    caseRow: RICH_CASE,
    activities: [
      {
        id: "note-1",
        activity_type: "note",
        body: "Surgeon noted visualization before fixation affects decision-making.",
        created_at: "2026-05-28T13:30:00.000Z",
      },
    ],
    providerName: "Dr. Apple",
    priorObservationCases: [
      {
        id: "case-prior",
        live_observation_clinical_pain_points: "Visualization before fixation creates uncertainty",
        status: "completed",
      },
    ],
  });

  const observationNotes = ["Extra time spent establishing visualization before fixation."];
  const productKnowledge = [getDebriefProductKnowledge("ACSIS")];
  const commercialSynthesis = buildDebriefCommercialSynthesis({
    plan,
    providerName: "Dr. Apple",
    organizationName: "Metro General",
    completedObservationCount: 5,
    pathwayStageLabel: "Debrief",
    observationNotes,
    productKnowledge,
  });

  return {
    engagementId: "eng-1",
    providerName: "Dr. Apple",
    organizationName: "Metro General",
    completedObservationCount: 5,
    planMode: "intelligence",
    pathwayStageId: "debrief",
    pathwayStageLabel: "Debrief",
    procedureLabel: "Robotic ventral hernia",
    observationMission: plan.context.observationMission,
    observationNotes,
    observationCorpus: [],
    providerIntelligence: EMPTY_PROVIDER_INTELLIGENCE_CONTEXT,
    intelligenceAggregator: EMPTY_PROVIDER_INTELLIGENCE_AGGREGATOR,
    intelligenceAudit: EMPTY_PROVIDER_INTELLIGENCE_AUDIT,
    extractedFindings: [],
    whatWeKnow: [],
    stillNeedToLearn: commercialSynthesis.validationNeeds.map((item) => item.question),
    commercialSynthesis,
    productKnowledge,
    plan,
  };
}

function brokenModelOutput(): AiDebriefStrategyBuilderOutput {
  return {
    debriefMission: "workflow delays",
    whatWeThinkWeLearned: ["visualization Challenge Fixation", "clinical pain point"],
    primaryHypothesis: "product signal",
    recommendedProductAngle: {
      productName: "aCSIS",
      fitLevel: "moderate",
      why: "workflow friction",
      risk: "provider profile",
    },
    conversationStrategy: {
      opening: "clinical pain point",
      validateObservationQuestions: ["Does workflow friction match?"],
      impactQuestions: ["product signal impact?"],
      opennessToChangeQuestions: ["Ready to buy ACSIS today?"],
      closingQuestion: "workflow delays",
    },
    recommendedAdvancementPath: {
      path: "360 Experience",
      why: "workflow delays",
    },
    desiredOutcome: "workflow delays",
  };
}

describe("polishAiDebriefStrategyBuilderOutput", () => {
  it("detects bare labels", () => {
    expect(isBareDebriefLabel("workflow delays")).toBe(true);
    expect(isBareDebriefLabel("visualization Challenge Fixation")).toBe(true);
    expect(
      isCompleteRepFacingSentence(
        "Across multiple observations, the team spent extra time establishing visualization before fixation.",
      ),
    ).toBe(true);
  });

  it("canonicalizes product name casing", () => {
    expect(canonicalDebriefProductName("aCSIS")).toBe("ACSIS");
    expect(canonicalDebriefProductName("acsis")).toBe("ACSIS");
    expect(canonicalDebriefProductName("Endolumik")).toBe("Endolumik");
  });

  it("rewrites broken model output into complete rep-facing coaching copy", () => {
    const polished = polishAiDebriefStrategyBuilderOutput(
      sanitizeAiDebriefStrategyBuilderOutput(brokenModelOutput()),
      buildTestContext(),
    );

    const blob = JSON.stringify(polished);

    expect(isBareDebriefLabel(polished.debriefMission)).toBe(false);
    expect(isBareDebriefLabel(polished.desiredOutcome)).toBe(false);
    expect(polished.debriefMission).toMatch(/observations|visualization|fixation/i);
    expect(polished.debriefMission).toMatch(/Dr\. Apple/);
    expect(polished.desiredOutcome).toMatch(/Leave with a clear decision/i);
    expect(polished.recommendedProductAngle.productName).toBe("ACSIS");
    expect(polished.recommendedProductAngle.why).toMatch(/ACSIS may be worth positioning/i);
    expect(polished.recommendedProductAngle.why).toMatch(/before|not before|confirm/i);
    expect(containsInternalCategoryLabel(blob)).toBe(false);
    expect(debriefCopyContainsBannedPattern(blob)).toBe(false);
    expect(polished.whatWeThinkWeLearned.every((line) => !isBareDebriefLabel(line))).toBe(true);
    expect(polished.conversationStrategy.opening).toMatch(/\?$/);
    expect(polished.conversationStrategy.opening.length).toBeGreaterThan(25);
    expect(polished.conversationStrategy.closingQuestion).toMatch(/\?$/);
  });

  it("rules fallback produces complete mission and desired outcome for rich observations", () => {
    const strategy = buildRulesFallbackAiDebriefStrategy(buildTestContext());

    expect(isCompleteRepFacingSentence(strategy.debriefMission)).toBe(true);
    expect(isCompleteRepFacingSentence(strategy.desiredOutcome)).toBe(true);
    expect(strategy.debriefMission).toMatch(/Dr\. Apple/);
    expect(isCompleteRepFacingSentence(strategy.recommendedProductAngle.why)).toBe(true);
    expect(isCompleteRepFacingSentence(strategy.recommendedProductAngle.risk)).toBe(true);
    expect(strategy.conversationStrategy.validateObservationQuestions[0]).toMatch(/\?$/);
    expect(JSON.stringify(strategy)).not.toMatch(/visualization Challenge Fixation/i);
  });
});
