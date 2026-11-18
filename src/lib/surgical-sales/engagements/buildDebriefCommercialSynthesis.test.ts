import { describe, expect, it } from "vitest";
import {
  buildDebriefCommercialSynthesis,
  isCommercialCategoryLabel,
} from "./buildDebriefCommercialSynthesis";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import { synthesizeDebriefCommercialStrategy } from "./synthesizeDebriefCommercialStrategy";

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
    body: "Surgeon noted visualization before fixation affects decision-making during robotic hernia cases.",
    created_at: "2026-05-28T13:30:00.000Z",
    metadata_json: {
      ai_extraction: {
        entities: [
          {
            type: "clinical_pain_point",
            label: "Clinical pain point",
            value: "Visualization before fixation creates friction",
            evidence: "Surgeon noted visualization before fixation affects decision-making.",
          },
        ],
      },
    },
  },
];

describe("buildDebriefCommercialSynthesis", () => {
  it("detects intelligence category labels", () => {
    expect(isCommercialCategoryLabel("workflow delays")).toBe(true);
    expect(isCommercialCategoryLabel("staff familiarity with the workflow")).toBe(true);
    expect(isCommercialCategoryLabel("product signal")).toBe(true);
    expect(
      isCommercialCategoryLabel(
        "Surgeon noted visualization before fixation affects decision-making.",
      ),
    ).toBe(false);
  });

  it("synthesizes evidence from notes and findings instead of category labels", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: RICH_CASE,
      activities: RICH_ACTIVITIES,
      providerName: "Dr. Chen",
      priorObservationCases: [
        {
          ...RICH_CASE,
          id: "case-prior-1",
          live_observation_clinical_pain_points: "Visualization before fixation creates uncertainty",
        },
        {
          ...RICH_CASE,
          id: "case-prior-2",
          live_observation_clinical_pain_points: "Extra time spent on visualization before mesh fixation",
        },
      ],
    });

    const synthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "Dr. Chen",
      organizationName: "Metro General",
      completedObservationCount: 4,
      pathwayStageLabel: "Debrief",
      observationNotes: RICH_ACTIVITIES.map((activity) => activity.body),
      productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    });

    expect(synthesis.hasSubstantiveEvidence).toBe(true);
    expect(synthesis.beliefSummary).toMatch(/Dr\. Chen/i);
    expect(synthesis.beliefRationale.length).toBeGreaterThan(0);

    const blob = JSON.stringify(synthesis);
    expect(blob).not.toMatch(/workflow delays/i);
    expect(blob).not.toMatch(/staff familiarity with the workflow/i);
    expect(blob).not.toMatch(/"product signal"/i);

    expect(synthesis.findings.some((f) => f.narrative.includes("visualization"))).toBe(true);
  });
});

describe("synthesizeDebriefCommercialStrategy", () => {
  it("produces regional-director style output without category labels", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: RICH_CASE,
      activities: RICH_ACTIVITIES,
      providerName: "Dr. Chen",
    });

    const synthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "Dr. Chen",
      organizationName: "Metro General",
      completedObservationCount: 4,
      pathwayStageLabel: "Debrief",
      observationNotes: RICH_ACTIVITIES.map((activity) => activity.body),
      productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    });

    const strategy = synthesizeDebriefCommercialStrategy({
      synthesis,
      planMode: "intelligence",
      plan,
      completedObservationCount: 4,
      providerName: "Dr. Chen",
    });

    expect(strategy.debriefMission.length).toBeGreaterThan(40);
    expect(strategy.primaryHypothesis.length).toBeGreaterThan(20);
    expect(strategy.whatWeThinkWeLearned.length).toBeGreaterThanOrEqual(3);
    expect(strategy.recommendedProductAngle.why).not.toMatch(/supports abdominal wall fixation workflow/i);

    const blob = JSON.stringify(strategy);
    expect(blob).not.toMatch(/workflow delays/i);
    expect(blob).not.toMatch(/product signal/i);
  });
});
