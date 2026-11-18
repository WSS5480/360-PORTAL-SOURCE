import { describe, expect, it } from "vitest";
import {
  buildProviderDebriefFieldExecutionBrief,
  normalizeDebriefTextKey,
  rankDebriefConversationQuestions,
  resolveDebriefObjectiveFromPlan,
} from "./buildProviderDebriefFieldExecutionBrief";
import { buildGenericProviderDebriefPlan } from "./buildGenericProviderDebriefPlan";
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

function intelligencePlan() {
  return buildProviderDebriefPlan({
    caseRow: RICH_CASE,
    activities: RICH_ACTIVITIES,
    providerName: "Dr. Chen",
    priorObservationCases: [
      {
        id: "case-prior-1",
        procedure_type: "Robotic ventral hernia",
        live_observation_clinical_pain_points: "Visualization before fixation creates uncertainty",
        status: "completed",
      },
    ],
  });
}

describe("buildProviderDebriefFieldExecutionBrief", () => {
  it("returns five execution sections for generic plans", () => {
    const plan = buildGenericProviderDebriefPlan({
      providerId: "p1",
      providerName: "Dr. Lee",
      facilityName: null,
      completedObservationCount: 2,
    });

    const brief = buildProviderDebriefFieldExecutionBrief({
      plan,
      planMode: "generic",
      completedObservationCount: 2,
    });

    expect(brief.guidanceTier).toBe("field_guide");
    expect(brief.strategy.missionWhy).toMatch(/commercial next step|worth acting on|observed/i);
    expect(brief.strategy.openingQuestion).toBeTruthy();
    expect(brief.strategy.mustAnswerBeforeLeaving.length).toBeGreaterThan(0);
    expect(brief.strategy.advancementPaths).toHaveLength(3);
    expect(brief.desiredOutcome.nextStepTitle).toBeTruthy();
  });

  it("deduplicates discussion guide and validation checklist", () => {
    const plan = intelligencePlan();
    const brief = buildProviderDebriefFieldExecutionBrief({
      plan,
      planMode: "intelligence",
      completedObservationCount: 5,
    });

    const guideKeys = new Set([
      normalizeDebriefTextKey(brief.discussionGuide.primaryQuestion),
      ...brief.discussionGuide.followUpQuestions.map(normalizeDebriefTextKey),
    ]);

    for (const item of brief.validationChecklist) {
      expect(guideKeys.has(normalizeDebriefTextKey(item.question))).toBe(false);
    }
  });

  it("places intelligence takeaways only in mission section", () => {
    const plan = intelligencePlan();
    const brief = buildProviderDebriefFieldExecutionBrief({
      plan,
      planMode: "intelligence",
      completedObservationCount: 5,
    });

    expect(brief.strategy.missionWhy).toMatch(/visualization|commercial|workflow/i);
    expect(brief.guidanceTier).not.toBe("field_guide");
  });

  it("does not repeat mission headline in desired outcome success statement", () => {
    const plan = intelligencePlan();
    const brief = buildProviderDebriefFieldExecutionBrief({
      plan,
      planMode: "intelligence",
      completedObservationCount: 5,
    });

    expect(normalizeDebriefTextKey(brief.desiredOutcome.successStatement)).not.toBe(
      normalizeDebriefTextKey(brief.mission.headline),
    );
    expect(brief.mission.headline).toBe(brief.strategy.missionWhy);
  });
});

describe("resolveDebriefObjectiveFromPlan", () => {
  it("frames surgeon confirmation objectives as validation goals", () => {
    const plan = intelligencePlan();
    expect(resolveDebriefObjectiveFromPlan(plan, "intelligence")).toMatch(/^Validate whether/i);
  });
});

describe("rankDebriefConversationQuestions", () => {
  it("prefers specific questions over generic template prompts in intelligence mode", () => {
    const plan = intelligencePlan();
    const ranked = rankDebriefConversationQuestions(plan.suggestedQuestions, "intelligence");

    expect(ranked[0]).toMatch(/visualization before fixation/i);
    expect(
      ranked.some((q) =>
        /^which workflow step created the most friction during the case you observed\?$/i.test(q),
      ),
    ).toBe(false);
  });
});
