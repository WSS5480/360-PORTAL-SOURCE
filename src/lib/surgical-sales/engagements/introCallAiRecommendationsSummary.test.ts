import { describe, expect, it } from "vitest";
import { buildIntroCallAiRecommendationsSummary } from "@/lib/surgical-sales/engagements/introCallAiRecommendationsSummary";
import { buildIntroCallTemplateState } from "@/lib/surgical-sales/engagements/introCallTemplateState";
import type { PreparationReadiness } from "@/lib/surgical-sales/engagements/engagementWizardPrepReadiness";

const readinessMinimal: PreparationReadiness = {
  level: "minimal",
  level_label: "Minimal",
  percent_complete: 25,
  met_count: 1,
  total_count: 4,
  signals: [
    { key: "goal", label: "Goal defined", met: false },
    { key: "discovery", label: "Discovery questions added", met: false },
    { key: "opening", label: "Opening statement added", met: true },
    { key: "product", label: "Product focus identified", met: false },
  ],
};

describe("buildIntroCallAiRecommendationsSummary", () => {
  it("summarizes template, product, probes, focus areas, and prep gaps", () => {
    const templateState = buildIntroCallTemplateState({
      productLine: "ACSIS",
      draft: {},
      appliedTemplateId: null,
      appliedSnapshot: null,
    });
    const summary = buildIntroCallAiRecommendationsSummary({
      templateState,
      productLine: "ACSIS",
      conversationFocus: ["observation_access", "workflow_mapping"],
      readiness: readinessMinimal,
    });
    expect(summary.templateName).toBe("ACSIS");
    expect(summary.productFocusLabel).toBe("ACSIS");
    expect(summary.probeCount).toBeGreaterThan(0);
    expect(summary.focusAreaCount).toBe(2);
    expect(summary.intelligenceGapCount).toBe(3);
    expect(summary.focusAreaLabels).toEqual(["Observation access", "Workflow mapping"]);
    expect(summary.prepGapLabels).toEqual(expect.arrayContaining(["Objective", "Questions", "Product"]));
  });

  it("uses portfolio discovery label when no product line", () => {
    const templateState = buildIntroCallTemplateState({
      productLine: "",
      draft: {},
      appliedTemplateId: null,
      appliedSnapshot: null,
    });
    const summary = buildIntroCallAiRecommendationsSummary({
      templateState,
      productLine: "",
      conversationFocus: [],
      readiness: { ...readinessMinimal, signals: readinessMinimal.signals.map((s) => ({ ...s, met: true })) },
    });
    expect(summary.templateName).toBe("Generic discovery");
    expect(summary.productFocusLabel).toBe("Portfolio discovery");
    expect(summary.intelligenceGapCount).toBe(0);
    expect(summary.focusAreaLabels).toEqual(["General discovery"]);
    expect(summary.prepGapLabels).toEqual([]);
  });
});
