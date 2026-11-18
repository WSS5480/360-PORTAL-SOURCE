import { describe, expect, it } from "vitest";
import {
  buildPreCallPlanSectionCompletion,
  isMeaningfulPreCallPlanSectionContent,
  isPreCallPlanDraftEmpty,
} from "@/lib/surgical-sales/engagements/preCallPlanSectionCompletion";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";

function emptyDraft(): EngagementWorkflowDraft {
  return {
    observation_goal: "",
    pre_observation_impact_opening_statement: "",
    pre_observation_probes: "",
    pre_observation_tools_resources: "",
    pre_observation_value_hypothesis: "",
    pre_observation_planned_close: "",
    pre_observation_additional_notes: "",
  };
}

describe("preCallPlanSectionCompletion", () => {
  it("does not count whitespace or filler as drafted", () => {
    expect(isMeaningfulPreCallPlanSectionContent("   ")).toBe(false);
    expect(isMeaningfulPreCallPlanSectionContent("n/a")).toBe(false);
    expect(isMeaningfulPreCallPlanSectionContent("tbd")).toBe(false);
  });

  it("counts substantive short multi-word content as drafted", () => {
    expect(isMeaningfulPreCallPlanSectionContent("Map OR access path")).toBe(true);
  });

  it("reports missing section labels for guidance", () => {
    const draft = {
      ...emptyDraft(),
      observation_goal: "Secure observation by June 15 with SPD lead.",
      pre_observation_probes: "Who owns scheduling?\nWhat is the vendor path?",
    };
    const completion = buildPreCallPlanSectionCompletion(draft);
    expect(completion.draftedCount).toBe(2);
    expect(completion.totalSections).toBe(7);
    expect(completion.missingLabels).toContain("Opening statement");
    expect(completion.missingLabels).toContain("Planned close");
    expect(isPreCallPlanDraftEmpty(draft)).toBe(false);
  });
});
