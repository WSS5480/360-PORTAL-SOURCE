import { describe, expect, it } from "vitest";
import { buildLiveEngagementCheatSheet } from "./buildLiveEngagementCheatSheet";
import { INTRO_CALL_START_MISSION_PRIMARY_QUESTION } from "./startMissionConfig";

const emptyPlan = {
  observation_goal: null,
  pre_observation_probes: null,
  pre_observation_value_hypothesis: null,
  pre_observation_planned_close: null,
  engagement_purpose: null,
  next_action: null,
};

describe("buildLiveEngagementCheatSheet", () => {
  it("uses first tactical ask as primary and rest as secondary", () => {
    const sheet = buildLiveEngagementCheatSheet({
      provider_snapshot: { display_name: "Dr. Lee" } as never,
      upcoming_engagement: {
        engagement_type: "office_visit",
        type_label: "Office Visit",
      } as never,
      plan_fields: { ...emptyPlan, observation_goal: "Confirm eval timeline." },
      tactical_asks: [
        {
          id: "1",
          text: "Who owns the committee vote?",
          source: "custom",
          status: "unanswered",
          priority: 0,
          dismiss_reason: null,
          answer_summary: null,
          intelligence_category: null,
          created_at: "",
          updated_at: "",
        },
        {
          id: "2",
          text: "What is the target go-live?",
          source: "custom",
          status: "unanswered",
          priority: 1,
          dismiss_reason: null,
          answer_summary: null,
          intelligence_category: null,
          created_at: "",
          updated_at: "",
        },
      ],
      suggested_goal: { goal: "", why: "" } as never,
      live_session: { live_notes: "Gatekeeper: Maria", outcome_recorded: false, outcome_label: null },
    });

    expect(sheet.missionGoal).toBe("Confirm eval timeline.");
    expect(sheet.primaryQuestion).toBe("Who owns the committee vote?");
    expect(sheet.secondaryQuestions).toEqual(["What is the target go-live?"]);
    expect(sheet.liveNotes).toBe("Gatekeeper: Maria");
  });

  it("falls back to intro pathway questions when asks are empty", () => {
    const sheet = buildLiveEngagementCheatSheet({
      provider_snapshot: { display_name: "Dr. Kim" } as never,
      upcoming_engagement: {
        engagement_type: "intro_call",
        type_label: "Intro Call",
      } as never,
      plan_fields: emptyPlan,
      tactical_asks: [],
      suggested_goal: { goal: "", why: "" } as never,
      live_session: null,
    });

    expect(sheet.primaryQuestion).toBe(INTRO_CALL_START_MISSION_PRIMARY_QUESTION);
    expect(sheet.secondaryQuestions.length).toBeGreaterThan(0);
  });

  it("uses saved pre-call probes for intro call when tactical asks are empty", () => {
    const sheet = buildLiveEngagementCheatSheet({
      provider_snapshot: { display_name: "Dr. Kim" } as never,
      upcoming_engagement: {
        engagement_type: "intro_call",
        type_label: "Intro Call",
      } as never,
      plan_fields: {
        ...emptyPlan,
        pre_observation_probes:
          "Which fixation workflow are you using today?\nWho books observation cases?",
      },
      tactical_asks: [],
      suggested_goal: { goal: "", why: "" } as never,
      live_session: null,
    });

    expect(sheet.primaryQuestion).toBe("Which fixation workflow are you using today?");
    expect(sheet.secondaryQuestions).toEqual(["Who books observation cases?"]);
  });
});
