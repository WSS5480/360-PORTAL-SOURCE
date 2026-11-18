import { describe, expect, it } from "vitest";
import { buildIntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import {
  applyIntroCallAiRecommendationSectionToDraft,
  buildIntroCallAiRecommendationSections,
  buildNextStepGoalPreview,
  introCallAiRecommendationSectionHasContent,
  mergeFollowUpIntoAdditionalNotes,
  sectionInsertActionLabel,
  shouldPromptBeforeIntroCallSectionReplace,
} from "@/lib/surgical-sales/engagements/introCallAiRecommendationSections";

describe("introCallAiRecommendationSections", () => {
  const template = buildIntroCallPrepTemplate({ productFocus: "generic" });

  it("builds five modular sections with labels", () => {
    const sections = buildIntroCallAiRecommendationSections(template);
    expect(sections.map((s) => s.label)).toEqual([
      "Objective (SMART)",
      "Opening Angle",
      "Priority Questions",
      "Operational Unknowns",
      "Next-Step Goal",
    ]);
    expect(sections.every((s) => s.previewText.length > 0)).toBe(true);
  });

  it("applies a single section without touching unrelated fields", () => {
    const draft = { observation_goal: "Custom goal" };
    const next = applyIntroCallAiRecommendationSectionToDraft(draft, template, "opening_angle", {
      replace: true,
    });
    expect(next.observation_goal).toBe("Custom goal");
    expect(String(next.pre_observation_impact_opening_statement ?? "").length).toBeGreaterThan(20);
    expect(next.pre_observation_probes).toBeUndefined();
  });

  it("inserts probes only when field is empty", () => {
    const withProbes = { pre_observation_probes: "Existing probe" };
    const inserted = applyIntroCallAiRecommendationSectionToDraft(withProbes, template, "priority_probes", {
      replace: false,
    });
    expect(inserted.pre_observation_probes).toBe("Existing probe");

    const replaced = applyIntroCallAiRecommendationSectionToDraft(withProbes, template, "priority_probes", {
      replace: true,
    });
    expect(replaced.pre_observation_probes).not.toBe("Existing probe");
  });

  it("merges follow-up into additional notes", () => {
    const merged = mergeFollowUpIntoAdditionalNotes(
      "Future observation goals:\n• Observe turnover",
      template.suggestedFollowUp,
    );
    expect(merged).toContain("Future observation goals:");
    expect(merged).toContain("Suggested follow-up:");
    expect(buildNextStepGoalPreview(template)).toContain("Follow-up");
  });

  it("resolves insert vs replace labels from draft", () => {
    expect(sectionInsertActionLabel({}, "smart_objective")).toBe("Insert");
    expect(sectionInsertActionLabel({ observation_goal: "x" }, "smart_objective")).toBe("Replace section");
    expect(shouldPromptBeforeIntroCallSectionReplace({ observation_goal: "x" }, "smart_objective")).toBe(
      true,
    );
    expect(introCallAiRecommendationSectionHasContent({ observation_goal: "x" }, "smart_objective")).toBe(
      true,
    );
  });
});
