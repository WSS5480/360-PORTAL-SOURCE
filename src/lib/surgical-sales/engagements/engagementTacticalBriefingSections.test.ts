import { describe, expect, it } from "vitest";
import {
  filterTacticalBriefingSections,
  STRATEGIC_TACTICAL_BRIEFING_SECTIONS,
  tacticalBriefingSectionsForMode,
} from "./engagementTacticalBriefingSections";

describe("engagementTacticalBriefingSections", () => {
  it("exposes seven strategic tactical section labels", () => {
    expect(STRATEGIC_TACTICAL_BRIEFING_SECTIONS.map((s) => s.label)).toEqual([
      "Tactical Priorities",
      "Opening Angle",
      "Top Asks",
      "Operational Unknowns",
      "Deployment Risk",
      "Next-Step Opportunity",
      "Field intel",
    ]);
  });

  it("filters sections to fields active for intro_call strategic workflow", () => {
    const sections = filterTacticalBriefingSections(
      tacticalBriefingSectionsForMode("strategic", "intro_call"),
      "strategic",
      "intro_call",
    );
    expect(sections).toHaveLength(7);
    expect(sections.flatMap((s) => s.fields.map((f) => f.key))).toContain("observation_goal");
    expect(sections.flatMap((s) => s.fields.map((f) => f.key))).toContain(
      "pre_observation_value_hypothesis",
    );
  });
});
