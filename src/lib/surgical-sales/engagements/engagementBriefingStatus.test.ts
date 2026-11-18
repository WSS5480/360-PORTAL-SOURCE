import { describe, expect, it } from "vitest";

import {
  resolvePlanningStatusOnCreate,
} from "./engagementPlanningModel";

describe("engagementBriefingStatus (compat)", () => {
  it("resolveBriefingStatusOnCreate matches planning model", () => {
    expect(
      resolvePlanningStatusOnCreate({
        creationPath: "quick_add",
        engagementRow: { briefing_status: "not_planned" },
      }),
    ).toBe("not_planned");
  });

  it("derives planning_in_progress from prep progress", () => {
    expect(
      resolvePlanningStatusOnCreate({
        creationPath: "plan_first",
        engagementRow: {
          observation_goal: "Map workflow",
          pre_call_plan_updated_at: "2026-06-01T12:00:00.000Z",
        },
      }),
    ).toBe("planning_in_progress");
  });
});
