import { describe, expect, it } from "vitest";
import { buildDebriefPrepareStrategyView } from "./buildDebriefPrepareStrategyView";
import {
  buildGenericAiDebriefStrategyBuilderOutput,
  shouldUseGenericDebriefStrategy,
} from "./buildGenericAiDebriefStrategyBuilderOutput";
import {
  buildRulesFallbackAiDebriefStrategy,
  resolveFrameworkForContext,
} from "./generateAiDebriefStrategyBuilder";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { buildGenericCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";
import { containsInternalCategoryLabel } from "./debriefClinicalTopicTranslation";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import type { AiDebriefStrategyBuilderContext } from "./loadAiDebriefStrategyBuilderContext";
import {
  EMPTY_PROVIDER_INTELLIGENCE_AGGREGATOR,
  EMPTY_PROVIDER_INTELLIGENCE_AUDIT,
} from "@/lib/surgical-sales/intelligence";
import { EMPTY_PROVIDER_INTELLIGENCE_CONTEXT } from "./providerIntelligenceContext";

describe("buildDebriefPrepareStrategyView", () => {
  it("maps strategy output into conversion prepare brief sections", () => {
    const generic = buildGenericAiDebriefStrategyBuilderOutput({
      providerName: "Dr. Chen",
      completedObservationCount: 5,
    });
    const framework = buildGenericCommercialReadinessFramework({
      providerName: "Dr. Chen",
      completedObservationCount: 5,
    });
    const view = buildDebriefPrepareStrategyView({
      framework,
      strategy: generic,
      source: "generic",
    });

    expect(view.conversionBrief.header.conversionQuestion.length).toBeGreaterThan(20);
    expect(view.conversionBrief.observationProgramSummary.crossCasePattern.length).toBeGreaterThan(10);
    expect(view.conversionBrief.nextMotionPaths).toHaveLength(3);
    expect(view.commercialStrategyBrief.productOpportunities.length).toBeGreaterThan(0);
    expect(view.commercialReadiness.dimensions).toHaveLength(6);
    expect(view.commercialReadiness.directorSummary.length).toBeGreaterThan(10);
    expect(view.missionWhy).toMatch(/debrief/i);
    expect(view.missionSuccess).toMatch(/hypothesis|observation|confirm/i);
    expect(view.whatWeThinkWeLearned.length).toBeGreaterThanOrEqual(3);
    expect(view.advancementPaths).toHaveLength(3);
    expect(view.advancementPaths.filter((path) => path.recommended)).toHaveLength(1);
    expect(view.recommendedProductAngle.fitLevelLabel).toBe("Not recommended yet");
  });

  it("uses rep-facing copy without internal ontology labels", () => {
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

    const observationNotes = ["Surgeon noted visualization before fixation affects decision-making."];
    const commercialSynthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "Dr. Chen",
      organizationName: "Metro General",
      completedObservationCount: 5,
      pathwayStageLabel: "Debrief",
      observationNotes,
      productKnowledge: [],
    });

    const context: AiDebriefStrategyBuilderContext = {
      engagementId: "eng-1",
      providerName: "Dr. Chen",
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
      productKnowledge: [],
      plan,
    };

    const framework = resolveFrameworkForContext(context);
    const view = buildDebriefPrepareStrategyView({
      framework,
      strategy: buildRulesFallbackAiDebriefStrategy(context, framework),
      source: "rules_fallback",
    });

    expect(view.commercialStrategyBrief.conversationPlan.validateObservation.length).toBeGreaterThan(
      0,
    );

    const conversionBlob = JSON.stringify(view.conversionBrief);
    expect(containsInternalCategoryLabel(conversionBlob)).toBe(false);
    expect(view.conversationStrategy.validateObservationQuestions.every((q) => q.endsWith("?"))).toBe(
      true,
    );
  });
});

describe("shouldUseGenericDebriefStrategy", () => {
  it("uses generic plan for zero-note generic mode", () => {
    expect(
      shouldUseGenericDebriefStrategy({
        planMode: "generic",
        completedObservationCount: 0,
        observationNotes: [],
        commercialSynthesis: { hasSubstantiveEvidence: false },
      }),
    ).toBe(true);
  });

  it("allows AI/rules coaching when partial notes exist", () => {
    expect(
      shouldUseGenericDebriefStrategy({
        planMode: "intelligence",
        completedObservationCount: 2,
        observationNotes: ["Short note from the case."],
        commercialSynthesis: { hasSubstantiveEvidence: true },
      }),
    ).toBe(false);
  });
});
