import { describe, expect, it } from "vitest";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { buildDeterministicCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";
import { frameworkAdvancementPathFromScores } from "./commercialReadinessFrameworkGuards";
import {
  buildRulesFallbackStrategyFromFramework,
} from "./generateDebriefStrategyFromFramework";
import { AiDebriefStrategyBuilderOutputSchema } from "./aiDebriefStrategyBuilderTypes";
import type { AiDebriefStrategyBuilderContext } from "./loadAiDebriefStrategyBuilderContext";
import {
  EMPTY_PROVIDER_INTELLIGENCE_AGGREGATOR,
  EMPTY_PROVIDER_INTELLIGENCE_AUDIT,
} from "@/lib/surgical-sales/intelligence";
import { EMPTY_PROVIDER_INTELLIGENCE_CONTEXT } from "./providerIntelligenceContext";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";

function buildTestContext(): AiDebriefStrategyBuilderContext {
  const plan = buildProviderDebriefPlan({
    caseRow: {
      id: "case-1",
      procedure_type: "Robotic ventral hernia",
      live_observation_clinical_pain_points: "Visualization before fixation creates uncertainty",
      live_observation_product_fit: "Possible",
    },
    activities: [
      {
        id: "note-1",
        activity_type: "note",
        body: "Surgeon noted visualization before fixation affects decision-making.",
        created_at: "2026-05-28T13:30:00.000Z",
      },
    ],
    providerName: "Dr. Chen",
  });

  const observationNotes = [
    "Surgeon noted visualization before fixation affects decision-making.",
  ];
  const commercialSynthesis = buildDebriefCommercialSynthesis({
    plan,
    providerName: "Dr. Chen",
    organizationName: "Metro General",
    completedObservationCount: 4,
    pathwayStageLabel: "Debrief",
    observationNotes,
    productKnowledge: [getDebriefProductKnowledge("ACSIS")],
  });

  return {
    engagementId: "eng-1",
    providerName: "Dr. Chen",
    organizationName: "Metro General",
    completedObservationCount: 4,
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
    productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    plan,
  };
}

describe("generateDebriefStrategyFromFramework", () => {
  it("derives coaching strategy from framework scores", () => {
    const context = buildTestContext();
    const framework = buildDeterministicCommercialReadinessFramework({
      synthesis: context.commercialSynthesis,
      plan: context.plan,
      observationNotes: context.observationNotes,
      completedObservationCount: context.completedObservationCount,
    });

    const strategy = buildRulesFallbackStrategyFromFramework(context, framework);
    const parsed = AiDebriefStrategyBuilderOutputSchema.safeParse(strategy);

    expect(parsed.success).toBe(true);
    expect(strategy.debriefMission).toMatch(/Dr\. Chen/i);
    expect(strategy.debriefMission).toMatch(/visualization|fixation|observation/i);
    expect(strategy.whatWeThinkWeLearned.length).toBeGreaterThanOrEqual(3);
    expect(strategy.whatWeThinkWeLearned.some((line) => line.includes("/100"))).toBe(true);
    expect(strategy.recommendedAdvancementPath.path).toMatch(
      /360 Experience|Case Commitment|No Action/,
    );
  });

  it("recommends No Action when pain and openness scores are low", () => {
    const context = buildTestContext();
    const framework = buildDeterministicCommercialReadinessFramework({
      synthesis: context.commercialSynthesis,
      plan: context.plan,
      observationNotes: [],
      completedObservationCount: 0,
    });

    const lowFramework = {
      ...framework,
      dimensions: framework.dimensions.map((dimension) =>
        dimension.id === "workflow_pain" || dimension.id === "openness_to_change"
          ? { ...dimension, score: 20 }
          : dimension,
      ),
    };

    expect(frameworkAdvancementPathFromScores(lowFramework)).toBe("No Action");
  });
});
