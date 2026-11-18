import { describe, expect, it } from "vitest";
import {
  buildIntelligenceCapturePriorities,
  buildInteractionCaptureRecommendations,
  formatIntelligenceEvolutionHeadline,
  sectionDeepFieldsUnlocked,
  splitIntelligenceSectionFields,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { buildProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { wizardFieldsForIntelligenceSection } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

describe("providerIntelligenceIncrementalCapture", () => {
  it("prioritizes required observation feasibility on empty profile", () => {
    const priorities = buildIntelligenceCapturePriorities({});
    expect(priorities.length).toBeGreaterThan(0);
    expect(priorities[0]?.dbKey).toBe("provider_observation_feasibility");
  });

  it("locks depth fields until an anchor has signal", () => {
    expect(sectionDeepFieldsUnlocked("clinical_workflow", {})).toBe(false);
    expect(
      sectionDeepFieldsUnlocked("clinical_workflow", {
        provider_procedure_focus: "cardiac",
      }),
    ).toBe(true);
  });

  it("splits quick vs deep fields in a section", () => {
    const fields = wizardFieldsForIntelligenceSection("clinical_workflow");
    const split = splitIntelligenceSectionFields("clinical_workflow", {}, fields);
    expect(split.quickFields.length).toBeGreaterThan(0);
    expect(split.deepFields.length).toBe(0);
    expect(split.deepUnlocked).toBe(false);
  });

  it("surfaces interaction recommendations for unknown anchors", () => {
    const recs = buildInteractionCaptureRecommendations({});
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]?.prompt.length).toBeGreaterThan(10);
  });

  it("formats evolution headline for sparse profiles", () => {
    const planning = buildProviderPlanningCompletion({});
    const headline = formatIntelligenceEvolutionHeadline(planning, {});
    expect(headline).toMatch(/not confirmed|not on file|not validated|TBD/i);
  });
});
