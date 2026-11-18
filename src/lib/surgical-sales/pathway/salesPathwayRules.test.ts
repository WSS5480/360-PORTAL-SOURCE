import { describe, expect, it } from "vitest";
import {
  SALES_PATHWAY_EVALUATION_ACTIVITY_LABELS,
  SALES_PATHWAY_NON_ADVANCING_EVENTS,
  SALES_PATHWAY_OFFICIAL_STAGE_ORDER,
  SALES_PATHWAY_STAGE_GOALS,
  SALES_PATHWAY_TRANSITION_RULES,
  isNonAdvancingPathwayEvent,
  nextSalesPathwayStage,
  salesPathwayStageGoal,
} from "./salesPathwayRules";

describe("salesPathwayRules", () => {
  it("defines the official six-stage pathway order", () => {
    expect(SALES_PATHWAY_OFFICIAL_STAGE_ORDER).toEqual([
      "discovery",
      "observe",
      "debrief",
      "evaluation",
      "commitment",
      "outcomes",
    ]);
  });

  it("documents stage goals and evaluation activities", () => {
    expect(salesPathwayStageGoal("discovery")).toMatch(/observation approval/i);
    expect(salesPathwayStageGoal("observe")).toMatch(/5 observed cases/i);
    expect(SALES_PATHWAY_EVALUATION_ACTIVITY_LABELS).toContain("360 Experience");
    expect(SALES_PATHWAY_EVALUATION_ACTIVITY_LABELS).not.toContain("Evaluation");
  });

  it("documents transition rules without 360 Experience as a stage", () => {
    expect(SALES_PATHWAY_TRANSITION_RULES.discovery_to_observation).toMatch(/observation_approved/i);
    expect(SALES_PATHWAY_TRANSITION_RULES.observation_to_debrief).toMatch(/>= 5/i);
    expect(SALES_PATHWAY_TRANSITION_RULES.debrief_to_evaluation).toMatch(/debrief_completed/i);
  });

  it("lists non-advancing operational events", () => {
    for (const event of [
      "engagement_created",
      "briefing_created",
      "scheduler_identified",
      "credentialing_path_entered",
      "notes_without_confirmed_outcome",
    ] as const) {
      expect(SALES_PATHWAY_NON_ADVANCING_EVENTS).toContain(event);
      expect(isNonAdvancingPathwayEvent(event)).toBe(true);
    }
    expect(isNonAdvancingPathwayEvent("observation_approved")).toBe(false);
  });

  it("walks next stage through outcomes", () => {
    expect(nextSalesPathwayStage("discovery")).toBe("observe");
    expect(nextSalesPathwayStage("outcomes")).toBeNull();
    expect(SALES_PATHWAY_STAGE_GOALS.commitment).toMatch(/structured product use/i);
  });
});
