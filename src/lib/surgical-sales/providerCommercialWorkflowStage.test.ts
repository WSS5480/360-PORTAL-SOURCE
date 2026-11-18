import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewVisibilityContext,
  intelligenceTrackIdsForCommercialStage,
  isIntelligenceSectionVisibleForCommercialStage,
  isProviderOverviewSectionVisible,
  providerOverviewWorkPreviewMode,
  resolveProviderCommercialWorkflowStage,
} from "./providerCommercialWorkflowStage";

describe("providerCommercialWorkflowStage", () => {
  it("maps early relationship stages to early discovery", () => {
    expect(resolveProviderCommercialWorkflowStage({ relationshipStage: "prospect" })).toBe(
      "early_discovery",
    );
    expect(resolveProviderCommercialWorkflowStage({ relationshipStage: "engagement_active" })).toBe(
      "evaluation",
    );
  });

  it("maps observation relationship stages", () => {
    expect(
      resolveProviderCommercialWorkflowStage({ relationshipStage: "observation_scheduled" }),
    ).toBe("observation");
  });

  it("elevates stage from evaluation opportunities", () => {
    expect(
      resolveProviderCommercialWorkflowStage({
        relationshipStage: "engagement_active",
        opportunities: [{ id: "1", stage: "evaluation_active" }],
      }),
    ).toBe("evaluation");
  });

  it("elevates to adoption from opportunity stage", () => {
    expect(
      resolveProviderCommercialWorkflowStage({
        relationshipStage: "active_relationship",
        opportunities: [{ id: "1", stage: "adoption_expanding" }],
      }),
    ).toBe("adoption");
  });

  it("hides enterprise panels on early discovery until data exists", () => {
    const stage = "early_discovery";
    const ctx = buildProviderOverviewVisibilityContext({});
    expect(isProviderOverviewSectionVisible("relationship", stage, ctx)).toBe(true);
    expect(isProviderOverviewSectionVisible("observation_readiness", stage, ctx)).toBe(true);
    expect(isProviderOverviewSectionVisible("cases_work", stage, ctx)).toBe(false);
    expect(isProviderOverviewSectionVisible("engagements_feed", stage, ctx)).toBe(false);
    expect(
      isProviderOverviewSectionVisible("cases_work", stage, {
        ...ctx,
        hasOpportunities: true,
      }),
    ).toBe(true);
  });

  it("filters intelligence tracks and sections by stage", () => {
    expect(intelligenceTrackIdsForCommercialStage("early_discovery")).toEqual(["clinical"]);
    expect(intelligenceTrackIdsForCommercialStage("evaluation")).toEqual([
      "relationship",
      "product_competitor",
    ]);
    expect(isIntelligenceSectionVisibleForCommercialStage("commercial_signals", "evaluation")).toBe(
      true,
    );
    expect(
      isIntelligenceSectionVisibleForCommercialStage("observation_readiness", "evaluation"),
    ).toBe(false);
  });

  it("observation work preview emphasizes cases", () => {
    const ctx = buildProviderOverviewVisibilityContext({});
    expect(providerOverviewWorkPreviewMode("observation", ctx)).toEqual({
      showCases: true,
      showOpportunities: false,
    });
  });
});
