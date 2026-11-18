import { describe, expect, it } from "vitest";
import { buildStartMissionView } from "@/lib/surgical-sales/engagements/buildStartMissionView";
import {
  INTRO_CALL_START_MISSION_OBJECTIVE,
  INTRO_CALL_START_MISSION_PRIMARY_QUESTION,
  INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS,
} from "@/lib/surgical-sales/engagements/startMissionConfig";

describe("buildStartMissionView", () => {
  it("uses fixed discovery intro call live content — not planning templates", () => {
    const view = buildStartMissionView({
      engagement: {
        id: "eng-1",
        engagement_type: "intro_call",
        status: "planned",
        observation_goal: "45-day SMART objective from template",
        engagement_purpose: "Long briefing objective",
        debrief_intelligence_snapshot: null,
      },
      provider: { id: "p1", display_name: "Dr. Smith" },
      organization: { id: "o1", name: "Metro Health" },
    });

    expect(view.content.objective).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(view.content.primary_question).toBe(INTRO_CALL_START_MISSION_PRIMARY_QUESTION);
    expect(view.content.secondary_questions).toEqual([...INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS]);
    expect(view.content.objective).not.toContain("45-day");
    expect(view.content.outcomes.map((o) => o.label)).toEqual([
      "Observation Approved",
      "Follow Up Needed",
      "Observation Denied",
      "No Meaningful Update",
    ]);
    expect(view.links.prepare_mission_href).toContain("/prepare");
    expect(view.links.engagement_detail_href).toContain("/engagements/eng-1");
  });

  it("falls back to generic live content for non-intro types", () => {
    const view = buildStartMissionView({
      engagement: {
        id: "eng-2",
        engagement_type: "follow_up",
        status: "planned",
        observation_goal: "Confirm tray preference.",
        next_action: "Who owns the decision?",
      },
      provider: { id: "p1", display_name: "Dr. Lee" },
    });

    expect(view.content.objective).toBe("Confirm tray preference.");
    expect(view.content.primary_question).toBe("Who owns the decision?");
    expect(view.content.secondary_questions).toEqual([]);
    expect(view.content.outcomes.map((o) => o.id)).toEqual([
      "touch_success",
      "touch_follow_up",
      "touch_no_progress",
    ]);
  });
});
