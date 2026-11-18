import { describe, expect, it } from "vitest";

import {
  intelligenceCardOpenItemsLabel,
  intelligenceCardScanActionLabel,
  operationalCardScanSummaryLine,
  resolveIntelligenceCardScopeBadge,
} from "@/lib/surgical-sales/intelligenceCardScanLayout";

describe("intelligenceCardScanLayout", () => {
  it("resolves scope badges", () => {
    expect(
      resolveIntelligenceCardScopeBadge({
        scope: "organization",
        dbKey: "provider_observation_access_path",
      }),
    ).toBe("facility");
    expect(
      resolveIntelligenceCardScopeBadge({
        scope: "provider",
        dbKey: "provider_technique_preferences",
      }),
    ).toBe("provider");
  });

  it("formats open items and scan actions", () => {
    expect(intelligenceCardOpenItemsLabel(2)).toBe("2 open items");
    expect(
      intelligenceCardScanActionLabel({ mapped: 0, unresolvedCount: 3, tone: "not_started" }),
    ).toBe("Map");
    expect(
      intelligenceCardScanActionLabel({ mapped: 2, unresolvedCount: 1, tone: "partial" }),
    ).toBe("Refine");
  });

  it("does not truncate scan summaries with ellipsis", () => {
    const line = operationalCardScanSummaryLine(
      "Observation workflow partially understood during early discovery.",
    );
    expect(line).not.toMatch(/…$/);
    expect(line).toContain("partially understood");
  });
});
