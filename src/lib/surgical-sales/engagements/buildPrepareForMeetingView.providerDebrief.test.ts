import { describe, expect, it } from "vitest";
import { buildPrepareForMeetingView } from "./buildPrepareForMeetingView";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { buildGenericProviderDebriefPlan } from "./buildGenericProviderDebriefPlan";

describe("buildPrepareForMeetingView provider debrief briefing", () => {
  it("includes provider debrief plan payload when supplied", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: {
        id: "case-1",
        procedure_type: "Robotic hernia",
        observation_goal: "Validate workflow fit.",
      },
      activities: [],
    });

    const view = buildPrepareForMeetingView({
      engagement: {
        id: "eng-1",
        engagement_type: "provider_debrief",
        status: "planned",
        provider_id: "prov-1",
        case_id: "case-1",
      },
      provider: { id: "prov-1", display_name: "Dr. Chen" },
      providerSpecialty: "General Surgery",
      activities: [],
      providerDebriefBriefing: {
        is_provider_debrief: true,
        plan_mode: "intelligence",
        completed_observation_count: 3,
        plan,
        linked_case_id: "case-1",
        linked_case_href: "/portal/sales/cases/case-1",
        missing_case_message: null,
      },
    });

    expect(view.provider_debrief_briefing.is_provider_debrief).toBe(true);
    expect(view.provider_debrief_briefing.plan_mode).toBe("intelligence");
    expect(view.provider_debrief_briefing.plan?.whatWeLearned.length).toBeGreaterThanOrEqual(0);
    expect(view.upcoming_engagement.type_label).toBe("Observation Debrief");
  });

  it("defaults to generic briefing shell without provider debrief loader input", () => {
    const view = buildPrepareForMeetingView({
      engagement: {
        id: "eng-2",
        engagement_type: "provider_debrief",
        status: "planned",
        provider_id: "prov-1",
      },
      provider: { id: "prov-1", display_name: "Dr. Chen" },
      activities: [],
    });

    expect(view.provider_debrief_briefing.is_provider_debrief).toBe(true);
    expect(view.provider_debrief_briefing.plan_mode).toBe("generic");
    expect(view.provider_debrief_briefing.missing_case_message).toBeNull();
  });

  it("surfaces generic debrief preparation workspace content", () => {
    const plan = buildGenericProviderDebriefPlan({
      providerId: "prov-1",
      providerName: "Dr. Chen",
      facilityName: "Memorial",
      completedObservationCount: 0,
    });

    const view = buildPrepareForMeetingView({
      engagement: {
        id: "eng-3",
        engagement_type: "provider_debrief",
        status: "planned",
        provider_id: "prov-1",
      },
      provider: { id: "prov-1", display_name: "Dr. Chen" },
      activities: [],
      providerDebriefBriefing: {
        is_provider_debrief: true,
        plan_mode: "generic",
        completed_observation_count: 0,
        plan,
        linked_case_id: null,
        linked_case_href: null,
        missing_case_message: null,
      },
    });

    expect(view.provider_debrief_briefing.plan?.suggestedQuestions.length).toBeGreaterThan(0);
    expect(view.provider_debrief_briefing.plan?.recommendedNextStep.title.length).toBeGreaterThan(0);
    expect(view.provider_debrief_briefing.missing_case_message).toBeNull();
  });
});
