import { describe, expect, it } from "vitest";

import {
  assertEngagementMissionPickerCoverage,
  browseCategoryForEngagementType,
  engagementCategoryForType,
  engagementMissionCardForType,
  ENGAGEMENT_MISSION_BROWSE_CATEGORIES,
} from "./engagementTypeMissionPicker";

describe("engagementTypeMissionPicker", () => {
  it("covers every MVP engagement type once", () => {
    expect(() => assertEngagementMissionPickerCoverage()).not.toThrow();
  });

  it("groups engagements by browse intent", () => {
    expect(ENGAGEMENT_MISSION_BROWSE_CATEGORIES.map((g) => g.label)).toEqual([
      "Discover",
      "Observe",
      "Advance",
      "Support",
    ]);
    expect(ENGAGEMENT_MISSION_BROWSE_CATEGORIES.find((g) => g.id === "discover")?.cards.map((c) => c.name)).toEqual([
      "Intro Call",
    ]);
    expect(ENGAGEMENT_MISSION_BROWSE_CATEGORIES.find((g) => g.id === "observe")?.cards.map((c) => c.name)).toEqual([
      "Observation Debrief",
    ]);
    expect(ENGAGEMENT_MISSION_BROWSE_CATEGORIES.find((g) => g.id === "advance")?.cards.map((c) => c.name)).toEqual([
      "Product Demo",
      "360 Experience",
      "Training",
    ]);
    expect(ENGAGEMENT_MISSION_BROWSE_CATEGORIES.find((g) => g.id === "support")?.cards.map((c) => c.name)).toEqual([
      "Follow-Up",
      "Reactivation",
    ]);
  });

  it("does not expose removed engagement types in the mission picker", () => {
    expect(engagementMissionCardForType("observation_request")).toBeNull();
    expect(engagementMissionCardForType("or_visit")).toBeNull();
    expect(engagementMissionCardForType("post_case_follow_up")).toBeNull();
  });

  it("exposes 360 Experience in the mission picker", () => {
    expect(engagementMissionCardForType("office_visit_360")?.name).toBe("360 Experience");
  });

  it("maps engagement types to persisted mission categories", () => {
    expect(engagementCategoryForType("or_visit")).toBe("observation_discovery");
    expect(engagementCategoryForType("product_demo")).toBe("product_evaluation");
    expect(engagementCategoryForType("office_visit_360")).toBe("product_evaluation");
    expect(engagementCategoryForType("follow_up")).toBe("relationship_management");
  });

  it("maps selectable engagement types to browse categories", () => {
    expect(browseCategoryForEngagementType("intro_call")).toBe("discover");
    expect(browseCategoryForEngagementType("office_visit_360")).toBe("advance");
    expect(browseCategoryForEngagementType("in_service_training")).toBe("advance");
    expect(browseCategoryForEngagementType("follow_up")).toBe("support");
  });
});
