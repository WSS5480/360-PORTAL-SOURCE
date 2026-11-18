import { describe, expect, it } from "vitest";
import {
  readTodayMatterSavedValueFromPlan,
  readTodayMatterValueFromPlan,
} from "./prepareWhatMattersEditable";

describe("prepareWhatMattersEditable", () => {
  it("separates saved plan values from suggested fallbacks", () => {
    const planFields = {
      observation_goal: null,
      pre_observation_probes: null,
      pre_observation_value_hypothesis: null,
      pre_observation_planned_close: null,
      engagement_purpose: null,
      next_action: null,
    };

    expect(
      readTodayMatterSavedValueFromPlan("discovery_goal", planFields, "intro_call"),
    ).toBe("");
    expect(
      readTodayMatterValueFromPlan(
        "discovery_goal",
        planFields,
        "Suggested discovery focus",
        "intro_call",
      ),
    ).toBe("Suggested discovery focus");
  });
});
