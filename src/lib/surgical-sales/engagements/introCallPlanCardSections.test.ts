import { describe, expect, it } from "vitest";
import { INTRO_CALL_PREP_PLAN_FIELD_KEYS } from "@/lib/surgical-sales/preCallPlanFields";
import {
  INTRO_CALL_PLAN_CARD_SECTIONS,
  introCallPlanCardFieldKeys,
} from "@/lib/surgical-sales/engagements/introCallPlanCardSections";

describe("introCallPlanCardSections", () => {
  it("defines five call plan cards aligned with AI recommendation sections", () => {
    expect(INTRO_CALL_PLAN_CARD_SECTIONS.map((s) => s.label)).toEqual([
      "Objective",
      "Opening Angle",
      "Priority Questions",
      "Operational Unknowns",
      "Next-Step Goal",
    ]);
  });

  it("covers every intro-call prep storage field exactly once", () => {
    const keys = introCallPlanCardFieldKeys();
    expect(keys).toHaveLength(INTRO_CALL_PREP_PLAN_FIELD_KEYS.length);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of INTRO_CALL_PREP_PLAN_FIELD_KEYS) {
      expect(keys).toContain(key);
    }
  });
});
