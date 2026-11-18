import { describe, expect, it } from "vitest";
import { buildProviderDetailStatusChips, PROVIDER_DETAIL_CHIP_LABEL } from "./buildProviderDetailStatusChips";

describe("buildProviderDetailStatusChips", () => {
  it("shows distinct commercial discovery and intelligence chips for new prospects", () => {
    const chips = buildProviderDetailStatusChips({
      relationshipStage: "prospect",
      intelligenceOverall: "Limited",
    });
    expect(chips.map((c) => c.label)).toEqual([
      PROVIDER_DETAIL_CHIP_LABEL.commercialDiscovery,
      PROVIDER_DETAIL_CHIP_LABEL.discoveryNeeded,
    ]);
  });

  it("shows relationship and intelligence chips when distinct", () => {
    const chips = buildProviderDetailStatusChips({
      relationshipStage: "active_relationship",
      intelligenceOverall: "Building",
    });
    expect(chips.map((c) => c.label)).toEqual([
      PROVIDER_DETAIL_CHIP_LABEL.activeRelationship,
      PROVIDER_DETAIL_CHIP_LABEL.intelligenceBuilding,
    ]);
  });

  it("includes Needs Follow-Up when planning is stale", () => {
    const chips = buildProviderDetailStatusChips({
      relationshipStage: "engagement_active",
      intelligenceOverall: "Building",
      planningStatus: "needs_update",
    });
    expect(chips.map((c) => c.label)).toContain(PROVIDER_DETAIL_CHIP_LABEL.needsFollowUp);
    expect(chips.length).toBeLessThanOrEqual(4);
  });

  it("uses Dormant for dormant stage without extra chips", () => {
    const chips = buildProviderDetailStatusChips({
      relationshipStage: "dormant",
      intelligenceOverall: "Limited",
      planningStatus: "needs_update",
    });
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toBe(PROVIDER_DETAIL_CHIP_LABEL.dormant);
  });

  it("caps at four chips", () => {
    const chips = buildProviderDetailStatusChips({
      relationshipStage: "active_relationship",
      intelligenceOverall: "Strong",
      planningStatus: "needs_update",
    });
    expect(chips.length).toBeLessThanOrEqual(4);
  });
});
