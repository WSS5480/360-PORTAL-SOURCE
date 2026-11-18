import { describe, expect, it } from "vitest";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryFieldStatus";
import {
  evidenceDerivedProgressPercent,
  formatEvidenceCaptureSummary,
  formatRequirementProgress,
  resolveEvidenceCaptureCounts,
  shouldShowAbstractMetrics,
} from "@/lib/surgical-sales/fieldIntelligenceMetricPolicy";

const F = DISCOVERY_FIELD_STATUS;

describe("fieldIntelligenceMetricPolicy", () => {
  it("counts confirmed, learning, and open signals", () => {
    const counts = resolveEvidenceCaptureCounts([
      { statusLabel: F.validated },
      { statusLabel: F.captured },
      { statusLabel: F.unknown },
      { statusLabel: F.notApplicable },
    ]);
    expect(counts).toEqual({ confirmed: 2, learning: 1, open: 1, total: 4 });
  });

  it("hides abstract metrics without field evidence or confirmed items", () => {
    expect(shouldShowAbstractMetrics({ hasFieldEvidence: false, confirmedCount: 0 })).toBe(false);
    expect(shouldShowAbstractMetrics({ hasFieldEvidence: true, confirmedCount: 0 })).toBe(false);
    expect(shouldShowAbstractMetrics({ hasFieldEvidence: true, confirmedCount: 1 })).toBe(true);
  });

  it("derives progress only from confirmed over total", () => {
    expect(
      evidenceDerivedProgressPercent({ confirmed: 2, learning: 1, open: 1, total: 4 }),
    ).toBe(50);
    expect(
      evidenceDerivedProgressPercent({ confirmed: 0, learning: 2, open: 2, total: 4 }),
    ).toBeNull();
  });

  it("formats evidence summaries instead of percentages when learning", () => {
    expect(
      formatEvidenceCaptureSummary(
        { confirmed: 1, learning: 2, open: 3, total: 6 },
        true,
      ),
    ).toBe("1 confirmed · 2 learning · 3 open");
    expect(formatEvidenceCaptureSummary({ confirmed: 0, learning: 0, open: 4, total: 4 }, true)).toBe(
      "4 open",
    );
    expect(formatEvidenceCaptureSummary({ confirmed: 0, learning: 0, open: 4, total: 4 }, false)).toBe(
      null,
    );
  });

  it("formats requirement progress as confirmed counts", () => {
    expect(formatRequirementProgress(2, 5, true)).toBe("2 of 5 confirmed");
    expect(formatRequirementProgress(0, 5, false)).toBeNull();
  });
});
