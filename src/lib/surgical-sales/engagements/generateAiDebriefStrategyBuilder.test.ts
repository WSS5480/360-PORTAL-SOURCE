import { describe, expect, it } from "vitest";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import {
  buildAiDebriefStrategyUserPrompt,
  buildRulesFallbackAiDebriefStrategy,
  generateAiDebriefStrategyBuilder,
} from "./generateAiDebriefStrategyBuilder";
import { COMMERCIAL_READINESS_DIMENSION_IDS } from "./commercialReadinessFrameworkTypes";
import {
  isBareDebriefLabel,
  polishAiDebriefStrategyBuilderOutput,
  sanitizeAiDebriefStrategyBuilderOutput,
} from "./polishAiDebriefStrategyBuilderOutput";
import { AiDebriefStrategyBuilderOutputSchema } from "./aiDebriefStrategyBuilderTypes";
import type { AiDebriefStrategyBuilderContext } from "./loadAiDebriefStrategyBuilderContext";
import {
  EMPTY_PROVIDER_INTELLIGENCE_AGGREGATOR,
  EMPTY_PROVIDER_INTELLIGENCE_AUDIT,
} from "@/lib/surgical-sales/intelligence";
import { EMPTY_PROVIDER_INTELLIGENCE_CONTEXT } from "./providerIntelligenceContext";
import { containsInternalCategoryLabel } from "./debriefClinicalTopicTranslation";
import { debriefCopyContainsBannedPattern } from "./debriefRepFacingCopy";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";

const RICH_CASE = {
  id: "case-1",
  surgeon_contact_id: "provider-1",
  procedure_type: "Robotic ventral hernia",
  case_date: "2026-05-28",
  observation_goal: "Validate ACSIS fit during robotic hernia workflow.",
  live_observation_clinical_pain_points: "Visualization before fixation creates uncertainty",
  live_observation_competitors: "Competitive mesh tray on field",
  live_observation_product_fit: "Possible",
};

const RICH_ACTIVITIES = [
  {
    id: "note-1",
    activity_type: "note",
    body: "Surgeon noted visualization before fixation affects decision-making.",
    created_at: "2026-05-28T13:30:00.000Z",
    metadata_json: {
      ai_extraction: {
        entities: [
          {
            type: "clinical_pain_point",
            label: "Clinical pain point",
            value: "Visualization before fixation creates friction",
          },
        ],
      },
    },
  },
];

function buildTestContext(overrides: Partial<AiDebriefStrategyBuilderContext> = {}): AiDebriefStrategyBuilderContext {
  const plan = buildProviderDebriefPlan({
    caseRow: RICH_CASE,
    activities: RICH_ACTIVITIES,
    providerName: "Dr. Chen",
    priorObservationCases: [],
  });

  const observationNotes = RICH_ACTIVITIES.map((activity) => activity.body);
  const productKnowledge = [getDebriefProductKnowledge("ACSIS")];
  const commercialSynthesis = buildDebriefCommercialSynthesis({
    plan,
    providerName: "Dr. Chen",
    organizationName: "Metro General",
    completedObservationCount: 4,
    pathwayStageLabel: "Debrief",
    observationNotes,
    productKnowledge,
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
    productKnowledge,
    plan,
    ...overrides,
  };
}

describe("generateAiDebriefStrategyBuilder", () => {
  it("builds rules fallback output matching the coaching schema", () => {
    const strategy = buildRulesFallbackAiDebriefStrategy(buildTestContext());
    const parsed = AiDebriefStrategyBuilderOutputSchema.safeParse(strategy);

    expect(parsed.success).toBe(true);
    expect(strategy.debriefMission.length).toBeGreaterThan(0);
    expect(strategy.whatWeThinkWeLearned.length).toBeGreaterThan(0);
    expect(strategy.whatWeThinkWeLearned.length).toBeLessThanOrEqual(4);
    expect(strategy.conversationStrategy.validateObservationQuestions.length).toBeGreaterThan(0);
    expect(strategy.recommendedAdvancementPath.path).toMatch(
      /360 Experience|Case Commitment|No Action/,
    );
  });

  it("sanitizes internal ontology labels from model output", () => {
    const sanitized = polishAiDebriefStrategyBuilderOutput(
      sanitizeAiDebriefStrategyBuilderOutput({
      debriefMission: "Validate Clinical Frustration with the surgeon.",
      whatWeThinkWeLearned: ["Visualization Challenge Fixation noted in observation intelligence."],
      primaryHypothesis: "Product signal suggests strong fit.",
      recommendedProductAngle: {
        productName: "aCSIS",
        fitLevel: "strong",
        why: "Workflow friction was observed during the case.",
        risk: "Still needed: Validate in field intelligence.",
      },
      conversationStrategy: {
        opening: "Does the clinical pain point match your experience?",
        validateObservationQuestions: ["Did workflow friction match what you saw?"],
        impactQuestions: ["How does product signal affect the case?"],
        opennessToChangeQuestions: ["Are you open to exploring a change?"],
        closingQuestion: "Which path fits — 360 Experience or Case Commitment?",
      },
      recommendedAdvancementPath: {
        path: "360 Experience",
        why: "Workflow value may exist but commitment is early.",
      },
      desiredOutcome: "workflow delays",
    }),
      buildTestContext(),
    );

    const blob = JSON.stringify(sanitized);
    expect(containsInternalCategoryLabel(blob)).toBe(false);
    expect(debriefCopyContainsBannedPattern(blob)).toBe(false);
    expect(sanitized.recommendedProductAngle.productName).toBe("ACSIS");
    expect(isBareDebriefLabel(sanitized.desiredOutcome)).toBe(false);
  });

  it("includes commercial synthesis evidence in the framework user prompt", () => {
    const prompt = buildAiDebriefStrategyUserPrompt(buildTestContext());
    expect(prompt).toMatch(/Dr\. Chen/);
    expect(prompt).toMatch(/Pathway stage: Debrief/);
    expect(prompt).toMatch(/ACSIS/);
    expect(prompt).toMatch(/Observation notes/);
    expect(prompt).toMatch(/Commercial Readiness Framework/);
    expect(prompt).not.toMatch(/What we know \(rep-facing rollup\)/);
  });

  it("uses none fit level when product evidence is absent", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: { ...RICH_CASE, live_observation_product_fit: null, live_observation_clinical_pain_points: null },
      activities: [],
      providerName: "Dr. Lee",
    });

    const commercialSynthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "Dr. Lee",
      organizationName: null,
      completedObservationCount: 0,
      pathwayStageLabel: "Debrief",
      observationNotes: [],
      productKnowledge: [],
    });

    const strategy = buildRulesFallbackAiDebriefStrategy(
      buildTestContext({
        providerName: "Dr. Lee",
        planMode: "generic",
        plan,
        productKnowledge: [],
        commercialSynthesis,
        completedObservationCount: 0,
        observationNotes: [],
      }),
    );

    expect(strategy.recommendedProductAngle.fitLevel).toBe("none");
    expect(strategy.recommendedProductAngle.productName).toBeNull();
  });

  it("runs two-phase orchestration with framework before strategy", async () => {
    const result = await generateAiDebriefStrategyBuilder(buildTestContext());

    expect(result.framework.dimensions).toHaveLength(6);
    expect(result.framework.dimensions.map((d) => d.id)).toEqual([
      ...COMMERCIAL_READINESS_DIMENSION_IDS,
    ]);
    expect(result.strategy.debriefMission.length).toBeGreaterThan(0);
    expect(result.strategy.whatWeThinkWeLearned.length).toBeGreaterThanOrEqual(3);
    expect(result.source).toBe("rules_fallback");
  });
});
