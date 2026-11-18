import { describe, expect, it } from "vitest";
import {
  buildIntelligenceSectionProgressPills,
  buildIntelligenceSectionScanSummary,
  fieldScanSummaryLine,
} from "./intelligenceSectionScanView";
import type { SectionOperationalMappingProgress } from "./providerIntelligenceOperationalMapping";

function progress(
  partial: Partial<SectionOperationalMappingProgress>,
): SectionOperationalMappingProgress {
  return {
    mapped: 1,
    total: 4,
    unresolvedCount: 2,
    confidence: "partial",
    readinessTone: "unmapped",
    statusBadge: "Developing",
    metricsLine: "1 confirmed · 2 open questions",
    mappedLine: "",
    unresolvedLine: null,
    progressLines: [],
    ...partial,
  };
}

describe("intelligenceSectionScanView", () => {
  it("builds progress pills without truncation", () => {
    expect(buildIntelligenceSectionProgressPills(progress({ mapped: 1, unresolvedCount: 2 }))).toEqual([
      { id: "confirmed", label: "1 confirmed", variant: "confirmed" },
      { id: "open", label: "2 open", variant: "open" },
    ]);
  });

  it("uses short field summaries for top gaps", () => {
    expect(fieldScanSummaryLine("provider_observation_coordinator_contact")).toBe(
      "Scheduling owner still learning",
    );
    expect(fieldScanSummaryLine("provider_procedure_focus")).toBe("Procedure mix still learning");
  });

  it("prefers gap-based scan summary over long fragments", () => {
    const line = buildIntelligenceSectionScanSummary({
      sectionId: "or_environment",
      progress: progress({ mapped: 1, unresolvedCount: 2 }),
      topGap: {
        dbKey: "provider_observation_access_path",
        sectionId: "or_environment",
        label: "OR access",
        phrase: "Vendor credentialing must be completed before any vendor can observe",
      } as never,
    });
    expect(line).toBe("Observation access path still learning");
    expect(line).not.toMatch(/\.\.\./);
  });
});
