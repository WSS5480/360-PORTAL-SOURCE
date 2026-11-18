import { describe, expect, it } from "vitest";
import {
  INTRO_CALL_PREP_PLAN_FIELD_KEYS,
  PRE_CALL_PLAN_FIELD_CONFIGS,
} from "@/lib/surgical-sales/preCallPlanFields";

describe("Intro Call prep plan fields", () => {
  it("excludes hospital and surgeon from wizard prep form keys", () => {
    expect(INTRO_CALL_PREP_PLAN_FIELD_KEYS).not.toContain("pre_call_hospital_name");
    expect(INTRO_CALL_PREP_PLAN_FIELD_KEYS).not.toContain("pre_call_surgeon_name");
    expect(INTRO_CALL_PREP_PLAN_FIELD_KEYS.length).toBe(7);
    expect(INTRO_CALL_PREP_PLAN_FIELD_KEYS[0]).toBe("observation_goal");
  });

  it("still stores hospital and surgeon on engagement save via full field config", () => {
    const keys = PRE_CALL_PLAN_FIELD_CONFIGS.map((f) => f.key);
    expect(keys).toContain("pre_call_hospital_name");
    expect(keys).toContain("pre_call_surgeon_name");
  });
});
