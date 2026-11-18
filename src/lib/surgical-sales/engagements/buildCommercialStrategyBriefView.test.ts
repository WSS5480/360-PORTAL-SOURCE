import { describe, expect, it } from "vitest";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { buildDeterministicCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";
import {
  buildCommercialStrategyBriefView,
  buildExecutiveBriefParagraph,
  buildProductOpportunityCards,
} from "./buildCommercialStrategyBriefView";
import { buildDebriefPrepareStrategyView } from "./buildDebriefPrepareStrategyView";
import {
  buildRulesFallbackAiDebriefStrategy,
  resolveFrameworkForContext,
} from "./generateAiDebriefStrategyBuilder";
import type { AiDebriefStrategyBuilderContext } from "./loadAiDebriefStrategyBuilderContext";
import {
  EMPTY_PROVIDER_INTELLIGENCE_AGGREGATOR,
  EMPTY_PROVIDER_INTELLIGENCE_AUDIT,
} from "@/lib/surgical-sales/intelligence";
import { EMPTY_PROVIDER_INTELLIGENCE_CONTEXT } from "./providerIntelligenceContext";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import { containsInternalCategoryLabel } from "./debriefClinicalTopicTranslation";

const RICH_CASE = {
  id: "case-1",
  procedure_type: "Robotic ventral hernia",
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
    providerName: "Dr. Chen",
  });

  const observationNotes = [
    "Surgeon noted visualization before fixation affects decision-making.",
  ];
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
  };
}

describe("buildCommercialStrategyBriefView", () => {
  it("structures advice-first brief with collapsed evidence payload", () => {
    const context = buildTestContext();
    const framework = resolveFrameworkForContext(context);
    const strategy = buildRulesFallbackAiDebriefStrategy(context, framework);

    const prepareView = buildDebriefPrepareStrategyView({
      framework,
      strategy,
      source: "rules_fallback",
      productCandidates: context.commercialSynthesis.productCandidates,
      productKnowledge: context.productKnowledge,
      providerName: context.providerName,
    });

    const brief = prepareView.commercialStrategyBrief;

    expect(brief.executiveBrief.length).toBeGreaterThan(40);
    expect(brief.snapshot.primaryLever).toBeTruthy();
    expect(brief.snapshot.bestNextStep).toMatch(/360 Experience|Case Commitment|No Action/);
    expect(brief.snapshot.confidence).toMatch(/High|Medium|Low/);
    expect(brief.productOpportunities.length).toBeGreaterThan(0);
    expect(brief.conversationPlan.opening.length).toBeGreaterThan(10);
    expect(brief.advancementPaths).toHaveLength(3);
    expect(brief.supportingEvidence.commercialReadiness.dimensions).toHaveLength(6);
    expect(brief.supportingEvidence.learnedBullets.length).toBeGreaterThan(0);
  });

  it("never shows No product recommended as product display name", () => {
    const context = buildTestContext();
    const framework = resolveFrameworkForContext(context);
    const strategy = buildRulesFallbackAiDebriefStrategy(context, framework);

    const brief = buildCommercialStrategyBriefView({
      prepareView: buildDebriefPrepareStrategyView({
        framework,
        strategy,
        source: "rules_fallback",
        productCandidates: context.commercialSynthesis.productCandidates,
        productKnowledge: context.productKnowledge,
        providerName: context.providerName,
      }),
    });

    for (const product of brief.productOpportunities) {
      expect(product.displayName.toLowerCase()).not.toContain("no product recommended");
    }
  });

  it("includes explore_first card when no named products qualify", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: { ...RICH_CASE, live_observation_product_fit: null },
      activities: [],
      providerName: "Dr. Lee",
    });
    const observationNotes = ["Team spent extra time on setup."];
    const commercialSynthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "Dr. Lee",
      organizationName: null,
      completedObservationCount: 1,
      pathwayStageLabel: "Debrief",
      observationNotes,
      productKnowledge: [],
    });
    const context: AiDebriefStrategyBuilderContext = {
      engagementId: "eng-2",
      providerName: "Dr. Lee",
      organizationName: null,
      completedObservationCount: 1,
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
      stillNeedToLearn: [],
      commercialSynthesis,
      productKnowledge: [],
      plan,
    };

    const framework = buildDeterministicCommercialReadinessFramework({
      synthesis: commercialSynthesis,
      plan,
      observationNotes,
      completedObservationCount: 1,
    });

    const cards = buildProductOpportunityCards({
      productCandidates: [],
      productKnowledge: [],
      strategy: {
        debriefMission: "Validate workflow.",
        whatWeThinkWeLearned: ["Setup took longer than expected."],
        primaryHypothesis: "Workflow may matter.",
        recommendedProductAngle: {
          productName: null,
          fitLevel: "none",
          why: "Too early.",
          risk: "Confirm first.",
        },
        conversationStrategy: {
          opening: "Does this match your experience?",
          validateObservationQuestions: ["Did setup feel longer?"],
          impactQuestions: ["How does that affect flow?"],
          opennessToChangeQuestions: ["Open to exploring a change?"],
          closingQuestion: "Which next step fits?",
        },
        recommendedAdvancementPath: { path: "No Action", why: "Hold." },
        desiredOutcome: "Leave with clarity.",
      },
      readiness: buildDebriefPrepareStrategyView({
        framework,
        strategy: buildRulesFallbackAiDebriefStrategy(context, framework),
        source: "rules_fallback",
      }).commercialReadiness,
    });

    expect(cards.some((c) => c.fitLevel === "explore_first")).toBe(true);
  });

  it("executive brief avoids ontology labels", () => {
    const context = buildTestContext();
    const framework = resolveFrameworkForContext(context);
    const prepareView = buildDebriefPrepareStrategyView({
      framework,
      strategy: buildRulesFallbackAiDebriefStrategy(context, framework),
      source: "rules_fallback",
      productCandidates: context.commercialSynthesis.productCandidates,
      providerName: context.providerName,
    });

    const paragraph = buildExecutiveBriefParagraph({
      readiness: prepareView.commercialReadiness,
      missionWhy: prepareView.missionWhy,
      desiredOutcome: prepareView.desiredOutcome,
      learnedBullets: prepareView.whatWeThinkWeLearned,
      providerName: context.providerName,
    });

    expect(containsInternalCategoryLabel(paragraph)).toBe(false);
    expect(paragraph).toMatch(/debrief|observation|commercial/i);
  });
});
