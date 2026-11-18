import { describe, expect, it } from "vitest";

import {
  buildIntroCallFieldBriefingContent,
  resolveIntroCallMissionGoalDisplay,
  buildIntroCallQuestionQueue,
  buildIntroCallPathwaySuggestedGoal,
  buildIntroCallPathwayTalkingPoints,
  bootstrapIntroCallPathwayTacticalAsks,
  INTRO_CALL_START_MISSION_OBJECTIVE,
  INTRO_CALL_START_MISSION_PRIMARY_QUESTION,
  INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS,
} from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { buildPrepareSuggestedGoal } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";

describe("introCallPathwayMission", () => {
  it("uses fixed pathway objective and questions", () => {
    const goal = buildIntroCallPathwaySuggestedGoal();

    expect(goal.goal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(goal.goal).not.toMatch(/45.?day/i);

    const points = buildIntroCallPathwayTalkingPoints({ bullets: [], last_key_insight: null });

    expect(points[0]).toBe(INTRO_CALL_START_MISSION_PRIMARY_QUESTION);
    expect(points).toContain(INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS[0]);
  });

  it("bootstraps tactical asks from pathway questions", () => {
    const asks = bootstrapIntroCallPathwayTacticalAsks({
      stored: null,
      knownIntelligence: { bullets: [], last_key_insight: null },
    });

    expect(asks[0]?.text).toBe(INTRO_CALL_START_MISSION_PRIMARY_QUESTION);
  });

  it("buildPrepareSuggestedGoal returns pathway objective for intro calls", () => {
    const goal = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      opportunityStage: "discovery",
      productLine: "ACSIS",
      knownIntelligence: { bullets: [], last_key_insight: null },
      engagement: { observation_goal: "Within 45 days, qualify hernia volume..." },
    });

    expect(goal.goal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(goal.goal).not.toContain("45 days");
  });

  it("buildIntroCallFieldBriefingContent drops answered follow-ups as intelligence grows", () => {
    const empty = buildIntroCallFieldBriefingContent({ bullets: [], last_key_insight: null });

    expect(empty.missionGoal).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(empty.priorityQuestion).toBe(INTRO_CALL_START_MISSION_PRIMARY_QUESTION);
    expect(empty.followUpQuestions).toEqual([...INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS]);

    const queue = buildIntroCallQuestionQueue({ bullets: [], last_key_insight: null });
    expect(queue[0]).toBe(INTRO_CALL_START_MISSION_PRIMARY_QUESTION);
    expect(queue).toHaveLength(4);

    const withCaseTypes = buildIntroCallFieldBriefingContent({
      bullets: [
        {
          key: "case_mix",
          label: "Observation",
          value: "Comfortable with lap ventral hernia for first observation",
        },
      ],
      last_key_insight: null,
    });

    expect(withCaseTypes.followUpQuestions).not.toContain(
      INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS[0],
    );
    expect(withCaseTypes.followUpQuestions).toContain(
      INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS[1],
    );

    const fullyKnown = buildIntroCallFieldBriefingContent({
      bullets: [
        {
          key: "case_mix",
          label: "Observation",
          value: "First observation on lap ventral cases",
        },
        {
          key: "focus",
          label: "Observation focus",
          value: "Pay attention to closure workflow and mesh handling",
        },
        {
          key: "friction",
          label: "Workflow",
          value: "Workflow friction shows up during turnover and supply prep",
        },
      ],
      last_key_insight: null,
    });

    expect(fullyKnown.followUpQuestions).toEqual([]);
  });

  it("resolveIntroCallMissionGoalDisplay prefers stored observation goal", () => {
    expect(resolveIntroCallMissionGoalDisplay(null)).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(resolveIntroCallMissionGoalDisplay("Custom gate for this site")).toBe(
      "Custom gate for this site",
    );
  });
});
