import { describe, expect, it } from "vitest";
import {
  buildProviderDebriefPlan,
  buildProviderDebriefPlanSnapshot,
  parseProviderDebriefPlanSnapshot,
  providerDebriefPlanSection,
  PROVIDER_DEBRIEF_PLAN_MAX_LEARNINGS,
} from "./buildProviderDebriefPlan";
import { collectObservationIntelligenceForDebriefPlan } from "./collectObservationIntelligenceForDebriefPlan";

const RICH_CASE = {
  id: "case-1",
  surgeon_contact_id: "provider-1",
  procedure_type: "Robotic ventral hernia",
  case_date: "2026-05-28",
  pre_call_hospital_name: "Memorial Hospital",
  observation_goal: "Validate ACSIS fit during robotic hernia workflow.",
  observation_key_questions: "How does the surgeon handle sac visualization?\nWould navigation help at the angle used today?",
  observation_quick_finding_product_interest: "Mentioned",
  live_observation_clinical_pain_points: "Hard to see the sac during takedown",
  live_observation_competitors: "Competitor tray on field",
  live_observation_product_fit: "Possible",
  live_observation_staff_process: "Circulator delayed instrument handoff",
  observation_validation_targets: [
    {
      id: "watch-1",
      label: "Workflow fit",
      source: "chip",
      status: "observed",
      created_at: "2026-05-01T00:00:00.000Z",
    },
    {
      id: "watch-2",
      label: "Visualization challenges",
      source: "chip",
      status: "planned",
      created_at: "2026-05-01T00:00:00.000Z",
    },
  ],
  observation_workflow_intelligence_snapshot: {
    sections: [
      { id: "product_opportunities", items: ["Surgeon asked about ACSIS navigation"] },
      { id: "competitor_observations", items: ["Competitor rep present in room"] },
    ],
    extracted_at: "2026-05-28T14:00:00.000Z",
  },
};

const RICH_ACTIVITIES = [
  {
    id: "note-1",
    activity_type: "note",
    body: "Surgeon struggled with visualization at the sac. Mentioned ACSIS navigation could help.",
    created_at: "2026-05-28T13:30:00.000Z",
    metadata_json: {
      ai_extraction: {
        entities: [
          {
            type: "product_signal",
            label: "Product Signal",
            value: "Mentioned ACSIS navigation",
            category: "Product",
            confidence: "Medium",
          },
        ],
        primaryCategory: "Product",
        extractedAt: "2026-05-28T13:30:00.000Z",
        model: "rules",
      },
    },
  },
];

describe("collectObservationIntelligenceForDebriefPlan", () => {
  it("collects learnings from notes, snapshot, quick findings, and validation targets", () => {
    const bundle = collectObservationIntelligenceForDebriefPlan({
      caseRow: RICH_CASE,
      activities: RICH_ACTIVITIES,
      providerContact: {
        id: "provider-1",
        display_name: "Dr. Chen",
        provider_workflow_pain_points: "Prefers low-profile ports",
      },
      providerName: "Dr. Chen",
    });

    expect(bundle.noteCount).toBe(1);
    expect(bundle.extractedSignalCount).toBe(1);
    expect(bundle.learnings.length).toBeGreaterThan(3);
    expect(bundle.learnings.some((item) => item.category === "product_signal")).toBe(true);
    expect(bundle.learnings.some((item) => item.category === "competitive_usage")).toBe(true);
    expect(bundle.observationMission).toMatch(/ACSIS fit/i);
  });
});

describe("buildProviderDebriefPlan", () => {
  it("builds all seven debrief plan sections", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: RICH_CASE,
      activities: RICH_ACTIVITIES,
      providerContact: { id: "provider-1", display_name: "Dr. Chen" },
      providerName: "Dr. Chen",
      generatedAt: "2026-05-31T12:00:00.000Z",
    });

    expect(plan.version).toBe(1);
    expect(plan.generatedAt).toBe("2026-05-31T12:00:00.000Z");
    expect(plan.context.providerName).toBe("Dr. Chen");
    expect(plan.context.procedureLabel).toBe("Robotic ventral hernia");
    expect(plan.whatWeLearned.length).toBeGreaterThan(0);
    expect(plan.whatWeLearned.length).toBeLessThanOrEqual(PROVIDER_DEBRIEF_PLAN_MAX_LEARNINGS);
    expect(plan.whatWeStillDontKnow.length).toBeGreaterThan(0);
    expect(plan.suggestedObjectives.length).toBeGreaterThan(0);
    expect(plan.suggestedQuestions.length).toBeGreaterThan(0);
    expect(plan.productOpportunityAssessment).toHaveLength(3);
    expect(plan.desiredMeetingOutcome.primary.length).toBeGreaterThan(10);
    expect(plan.recommendedNextStep.action).toBeTruthy();
    expect(plan.hasSufficientInputs).toBe(true);
    expect(plan.inputSummary.noteCount).toBe(1);
  });

  it("prioritizes clinical learnings over access-style signals", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: RICH_CASE,
      activities: RICH_ACTIVITIES,
    });

    const topLearning = plan.whatWeLearned[0];
    expect(["clinical_pain_point", "workflow_friction", "product_signal", "competitive_usage"]).toContain(
      topLearning?.category,
    );
  });

  it("assesses ACSIS fit when mentioned in observation intelligence", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: RICH_CASE,
      activities: RICH_ACTIVITIES,
    });

    const acsis = plan.productOpportunityAssessment.find((item) => item.product === "ACSIS");
    expect(acsis).toBeDefined();
    expect(acsis!.fitLevel).not.toBe("unlikely");
    expect(acsis!.fitRationale.length).toBeGreaterThan(0);
    expect(acsis!.evidence.some((line) => /acs?is/i.test(line))).toBe(true);
  });

  it("boosts ACSIS fit from workflow triggers when procedure aligns but product is not named", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: {
        id: "case-ventral",
        procedure_type: "Robotic ventral hernia",
        live_observation_workflow:
          "Extra time getting a better view before placing fixation",
        live_observation_clinical_pain_points:
          "Visualization before fixation creates uncertainty",
      },
      activities: [
        {
          activity_type: "note",
          body: "Extra visualization time before fixation slowed the closure sequence.",
        },
      ],
      providerName: "Dr. Test",
    });

    const acsis = plan.productOpportunityAssessment.find((item) => item.product === "ACSIS");
    expect(acsis?.fitLevel).toBe("needs_surgeon_confirmation");
    expect(acsis?.fitRationale.some((line) => /workflow aligns with ACSIS/i.test(line))).toBe(true);
  });

  it("surfaces unvalidated targets in what we still don't know", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: RICH_CASE,
      activities: RICH_ACTIVITIES,
    });

    expect(
      plan.whatWeStillDontKnow.some(
        (item) => item.kind === "unvalidated_target" && /visualization challenges/i.test(item.question),
      ),
    ).toBe(true);
  });

  it("recommends scheduling a provider debrief when observation notes exist", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: RICH_CASE,
      activities: RICH_ACTIVITIES,
      providerName: "Dr. Chen",
    });

    expect(plan.recommendedNextStep.action).toBe("schedule_provider_debrief");
    expect(plan.recommendedNextStep.title).toMatch(/provider debrief/i);
  });

  it("flags insufficient inputs when no notes or learnings exist", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: { id: "empty-case" },
    });

    expect(plan.hasSufficientInputs).toBe(false);
    expect(plan.recommendedNextStep.action).toBe("capture_additional_observation_notes");
    expect(plan.whatWeLearned).toEqual([]);
  });

  it("round-trips snapshot parse/build", () => {
    const plan = buildProviderDebriefPlan({ caseRow: RICH_CASE, activities: RICH_ACTIVITIES });
    const snapshot = buildProviderDebriefPlanSnapshot({
      plan,
      sourceCaseId: "case-1",
      sourceEngagementId: "eng-1",
    });

    expect(snapshot.sourceCaseId).toBe("case-1");
    expect(snapshot.sourceEngagementId).toBe("eng-1");

    const parsed = parseProviderDebriefPlanSnapshot(snapshot);
    expect(parsed?.whatWeLearned).toEqual(plan.whatWeLearned);
    expect(parsed?.recommendedNextStep.action).toBe(plan.recommendedNextStep.action);
  });

  it("exposes section accessors", () => {
    const plan = buildProviderDebriefPlan({ caseRow: RICH_CASE, activities: RICH_ACTIVITIES });

    expect(providerDebriefPlanSection(plan, "what_we_learned")).toEqual(plan.whatWeLearned);
    expect(providerDebriefPlanSection(plan, "recommended_next_step")).toEqual(plan.recommendedNextStep);
    expect(parseProviderDebriefPlanSnapshot({ version: 2 })).toBeNull();
  });
});
