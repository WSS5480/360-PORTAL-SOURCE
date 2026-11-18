import { describe, expect, it } from "vitest";
import {
  formatCategoryFindingsStat,
  formatCategoryOpenItemsStat,
  formatCategoryUpdatedStat,
  resolveIntelligenceCaptureCategoryStatus,
} from "@/lib/surgical-sales/intelligenceCapture/resolveIntelligenceCaptureCategoryStatus";

describe("resolveIntelligenceCaptureCategoryStatus", () => {
  it("returns empty when nothing is captured", () => {
    expect(
      resolveIntelligenceCaptureCategoryStatus({
        findingsCount: 0,
        openCount: 3,
        confirmedCount: 0,
      }),
    ).toBe("empty");
  });

  it("returns complete when captured with no open items", () => {
    expect(
      resolveIntelligenceCaptureCategoryStatus({
        findingsCount: 4,
        openCount: 0,
        confirmedCount: 1,
      }),
    ).toBe("complete");
  });

  it("returns healthy for substantive findings with one open item", () => {
    expect(
      resolveIntelligenceCaptureCategoryStatus({
        findingsCount: 4,
        openCount: 1,
        confirmedCount: 1,
      }),
    ).toBe("healthy");
  });

  it("returns partial for sparse findings with multiple open items", () => {
    expect(
      resolveIntelligenceCaptureCategoryStatus({
        findingsCount: 1,
        openCount: 3,
        confirmedCount: 0,
      }),
    ).toBe("partial");
  });

  it("formats practical stat labels", () => {
    expect(formatCategoryFindingsStat(1)).toBe("1 Finding");
    expect(formatCategoryFindingsStat(4)).toBe("4 Findings");
    expect(formatCategoryOpenItemsStat(3)).toBe("3 to explore");
    expect(formatCategoryUpdatedStat(new Date().toISOString())).toBe("Updated today");
  });
});
