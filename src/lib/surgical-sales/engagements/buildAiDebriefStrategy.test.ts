import { describe, expect, it } from "vitest";
import {
  buildAiDebriefStrategy,
  buildAiDebriefStrategyFromProviderDebriefPlan,
  buildAiDebriefStrategyGeneric,
} from "./buildAiDebriefStrategy";
import { containsInternalCategoryLabel } from "./debriefClinicalTopicTranslation";
import { debriefCopyContainsBannedPattern } from "./debriefRepFacingCopy";
import { normalizeDebriefTextKey } from "./buildProviderDebriefFieldExecutionBrief";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";

const RICH_CASE = {
  id: "case-1",
  surgeon_contact_id: "provider-1",
  procedure_type: "Robotic ventral hernia",
  case_date: "2026-05-28",
  observation_goal: "Validate ACSIS fit during robotic hernia workflow.",
  observation_key_questions: "How does sac visualization affect fixation decisions?",
  observation_quick_finding_product_interest: "Mentioned",
  live_observation_clinical_pain_points: "Visualization before fixation creates uncertainty",
  live_observation_competitors: "Competitive mesh tray on field",
  live_observation_product_fit: "Possible",
  observation_validation_targets: [
    {
      id: "watch-2",
      label: "Visualization before fixation",
      source: "chip",
      status: "planned",
      created_at: "2026-05-01T00:00:00.000Z",
    },
  ],
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
            category: "Clinical",
            confidence: "High",
          },
        ],
        primaryCategory: "Clinical",
        extractedAt: "2026-05-28T13:30:00.000Z",
        model: "rules",
      },
    },
  },
];

describe("buildAiDebriefStrategy", () => {
  it("translates internal labels and follows workflow-first conversation coaching", () => {
    const strategy = buildAiDebriefStrategy({
      providerName: "Dr. Chen",
      observationMission: "Validate ACSIS fit during robotic hernia workflow.",
      procedureLabel: "Robotic ventral hernia",
      completedObservationCount: 4,
      planMode: "intelligence",
      knownPainPoints: [
        {
          signal: "Visualization Challenge Fixation",
          recurrenceCount: 4,
          category: "clinical_pain_point",
        },
      ],
      productSignals: [{ product: "Endolumik", fitLevel: "possible" }],
      openEvidenceGaps: [],
      explorationCandidates: [],
      desiredOutcomePrimary: "Confirm product fit with the surgeon.",
      desiredOutcomeSupporting: [],
      nextStepTitle: "Guide the debrief",
      nextStepBody: "Walk through learnings together.",
    });

    const blob = JSON.stringify(strategy);
    expect(containsInternalCategoryLabel(blob)).toBe(false);
    expect(debriefCopyContainsBannedPattern(blob)).toBe(false);
    expect(strategy.openingQuestion).toMatch(/match how you experience/i);
    expect(strategy.decisionQuestions[0]).toMatch(/how does that affect/i);
    expect(strategy.opportunityQuestions[0]).toMatch(/meaningful workflow challenge/i);
    expect(strategy.opportunityQuestions.some((q) => /open to exploring/i.test(q))).toBe(true);
    expect(strategy.closingQuestions[0]).toMatch(/360 Experience|Case Commitment|No Action/i);
    expect(strategy.decisionQuestions.join(" ")).not.toMatch(/evaluation|360 Experience|Case Commitment/i);
    expect(strategy.opportunityQuestions.join(" ")).not.toMatch(/evaluation case/i);
  });

  it("does not repeat mission content across question sections", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: RICH_CASE,
      activities: RICH_ACTIVITIES,
      providerName: "Dr. Chen",
      priorObservationCases: [
        {
          id: "case-prior-1",
          live_observation_clinical_pain_points: "Visualization before fixation creates uncertainty",
          status: "completed",
        },
      ],
    });

    const strategy = buildAiDebriefStrategyFromProviderDebriefPlan({
      plan,
      planMode: "intelligence",
      completedObservationCount: 4,
    });

    const missionKey = normalizeDebriefTextKey(strategy.missionWhy);
    const allQuestions = [
      strategy.openingQuestion,
      ...strategy.decisionQuestions,
      ...strategy.opportunityQuestions,
      ...strategy.closingQuestions,
    ];

    for (const question of allQuestions) {
      expect(normalizeDebriefTextKey(question)).not.toBe(missionKey);
    }
    expect(containsInternalCategoryLabel(JSON.stringify(strategy))).toBe(false);
  });

  it("provides generic coaching without sales-stage questions early", () => {
    const strategy = buildAiDebriefStrategyGeneric({
      providerId: "p1",
      providerName: "Dr. Lee",
      facilityName: null,
      completedObservationCount: 0,
    });

    expect(strategy.missionWhy).toMatch(/worth acting on|observed/i);
    expect(strategy.openingQuestion.endsWith("?")).toBe(true);
    expect(strategy.decisionQuestions.length).toBeGreaterThan(0);
    expect(strategy.opportunityQuestions.length).toBeGreaterThan(0);
    expect(strategy.closingQuestions.length).toBeGreaterThan(0);
    expect(strategy.decisionQuestions.join(" ")).not.toMatch(/360 Experience|evaluation case/i);
  });

  it("recommends Case Commitment when product fit is strong", () => {
    const strategy = buildAiDebriefStrategy({
      providerName: "Dr. Chen",
      observationMission: null,
      procedureLabel: "Robotic ventral hernia",
      completedObservationCount: 4,
      planMode: "intelligence",
      knownPainPoints: [
        {
          signal: "Visualization before fixation creates uncertainty",
          recurrenceCount: 1,
          category: "clinical_pain_point",
        },
      ],
      productSignals: [{ product: "Endolumik", fitLevel: "strong" }],
      openEvidenceGaps: [],
      explorationCandidates: [],
      desiredOutcomePrimary: "Advance.",
      desiredOutcomeSupporting: [],
      nextStepTitle: "Next",
      nextStepBody: "Schedule cases.",
    });

    const recommended = strategy.advancementPaths.find((p) => p.status === "recommended");
    expect(recommended?.id).toBe("case_commitment");
  });
});
