import { describe, expect, it } from "vitest";
import { buildIntelligenceWorkspaceSummary } from "./buildIntelligenceWorkspaceSummary";
import { buildProviderPlanningCompletion } from "./providerPlanningCompletion";

describe("buildIntelligenceWorkspaceSummary", () => {
  it("returns null without planning", () => {
    expect(buildIntelligenceWorkspaceSummary({ contact: {} })).toBeNull();
  });

  it("bundles headline, cards, gaps, and actions for scan layout", () => {
    const summary = buildIntelligenceWorkspaceSummary({
      contact: {},
      planning: buildProviderPlanningCompletion({}),
    });
    expect(summary).not.toBeNull();
    expect(summary!.commercialBrief.length).toBeGreaterThan(3);
    expect(summary!.maturityStageLabel).toBe("Early discovery");
    expect(summary!.commercialBrief.length).toBeLessThan(80);
    expect(summary!.workflowStageLabel.length).toBeGreaterThan(3);
    expect(summary!.statusCards).toHaveLength(4);
    expect(summary!.missingSignals.length).toBeLessThanOrEqual(3);
    expect(summary!.discoveryActionsVisibleCount).toBe(3);
    expect(summary!.discoveryActions.length).toBeGreaterThan(0);
  });

  it("keeps missing signals distinct from discovery coaching", () => {
    const summary = buildIntelligenceWorkspaceSummary({
      contact: { provider_observation_feasibility: "easy" },
      planning: buildProviderPlanningCompletion({ provider_observation_feasibility: "easy" }),
      relationshipStage: "observation_requested",
    });
    expect(summary).not.toBeNull();
    const gapPhrases = summary!.missingSignals.map((g) => g.phrase.toLowerCase());
    const actionHeadlines = summary!.discoveryActions.map((a) => a.headline.toLowerCase());
    if (gapPhrases.length > 0 && actionHeadlines.length > 0) {
      expect(actionHeadlines[0]).not.toBe(gapPhrases[0]);
    }
  });
});
