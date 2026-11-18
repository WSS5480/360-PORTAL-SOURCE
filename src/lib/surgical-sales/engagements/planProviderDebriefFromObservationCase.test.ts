import { describe, expect, it } from "vitest";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { buildEngagementPreCallDraftFromDebriefPlan } from "./planProviderDebriefFromObservationCase";

const CASE_ROW = {
  id: "case-1",
  surgeon_contact_id: "provider-1",
  procedure_type: "Robotic ventral hernia",
  case_date: "2026-05-28",
  pre_call_hospital_name: "Memorial Hospital",
  observation_goal: "Validate ACSIS fit during robotic hernia workflow.",
  observation_key_questions: "How does the surgeon handle sac visualization?",
  live_observation_clinical_pain_points: "Hard to see the sac during takedown",
  live_observation_competitors: "Competitor tray on field",
  live_observation_product_fit: "Possible",
};

describe("buildEngagementPreCallDraftFromDebriefPlan", () => {
  it("maps debrief plan sections into engagement pre-call fields", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: CASE_ROW,
      activities: [],
      providerContact: { display_name: "Dr. Smith" },
      providerName: "Dr. Smith",
      facilityName: "Memorial Hospital",
    });

    const draft = buildEngagementPreCallDraftFromDebriefPlan(plan, {
      providerName: "Dr. Smith",
      facilityName: "Memorial Hospital",
    });

    expect(draft.pre_call_hospital_name).toBe("Memorial Hospital");
    expect(draft.pre_call_surgeon_name).toBe("Dr. Smith");
    expect(draft.observation_goal).toBe(plan.desiredMeetingOutcome.primary);
    expect(draft.pre_observation_impact_opening_statement).toContain("What we observed:");
    expect(draft.pre_observation_probes).toContain("•");
    expect(draft.pre_observation_value_hypothesis).toContain("•");
    expect(draft.pre_observation_planned_close).toContain(plan.recommendedNextStep.title);
  });
});
