import { describe, expect, it } from "vitest";
import {
  aggregateFindingEvidenceAcrossCases,
  evidenceConfidenceFromObservationCount,
  formatEvidenceObservationLabel,
} from "./observationFindingEvidenceConfidence";

describe("observationFindingEvidenceConfidence", () => {
  it("maps observation count to confidence tiers", () => {
    expect(evidenceConfidenceFromObservationCount(1)).toBe("Low");
    expect(evidenceConfidenceFromObservationCount(2)).toBe("Medium");
    expect(evidenceConfidenceFromObservationCount(3)).toBe("High");
    expect(evidenceConfidenceFromObservationCount(5)).toBe("High");
  });

  it("formats evidence observation labels", () => {
    expect(formatEvidenceObservationLabel(1)).toBe("Observed in 1 completed case");
    expect(formatEvidenceObservationLabel(3)).toBe("Observed in 3 completed cases");
  });

  it("normalizes observed suffixes when matching findings", () => {
    const aggregated = aggregateFindingEvidenceAcrossCases([
      {
        caseId: "case-1",
        findings: [{ label: "Competitor tray" }, { label: "Competitor tray observed" }],
      },
    ]);

    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]?.observationCount).toBe(1);
  });

  it("does not count incomplete cases toward completed observation totals by default", () => {
    const aggregated = aggregateFindingEvidenceAcrossCases([
      { caseId: "case-1", findings: [{ label: "Competitor Mesh" }] },
    ]);

    expect(aggregated[0]?.completedObservationCount).toBe(0);
    expect(aggregated[0]?.capturedFromCurrentNote).toBe(false);
  });

  it("aggregates repeated findings across observation cases", () => {
    const aggregated = aggregateFindingEvidenceAcrossCases([
      { caseId: "case-1", caseComplete: true, findings: [{ label: "Competitor Mesh" }] },
      { caseId: "case-2", caseComplete: true, findings: [{ label: "Competitor Mesh" }] },
      { caseId: "case-3", caseComplete: true, findings: [{ label: "competitor mesh" }] },
    ]);

    expect(aggregated).toEqual([
      expect.objectContaining({
        label: "Competitor Mesh",
        observationCount: 3,
        confidence: "High",
      }),
    ]);
  });
});
