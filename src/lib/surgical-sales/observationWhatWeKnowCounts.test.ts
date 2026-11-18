import { describe, expect, it } from "vitest";

import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import { buildWhatWeKnowLines } from "./observationRepPresentationCopy";

function finding(overrides: Partial<AggregatedFindingEvidence>): AggregatedFindingEvidence {
  return {
    label: "Bard Mesh observed",
    matchKey: "bard mesh",
    normalizedFindingId: "product_in_use:bard-mesh",
    observationCount: 3,
    completedObservationCount: 3,
    capturedFromCurrentNote: false,
    isPositiveStaffSignal: false,
    isEarlySignal: false,
    confidence: "High",
    evidenceLabel: "Observed in 3 cases",
    sourceCaseIds: ["case-a", "case-b", "case-c"],
    ...overrides,
  };
}

describe("What We Know repetition counts (program_fraction style)", () => {
  it("appends 'seen in N of M observations' for repeated findings", () => {
    const lines = buildWhatWeKnowLines({
      findings: [finding({})],
      providerName: "Dr. Lettuce",
      programCompletedCount: 4,
      countStyle: "program_fraction",
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/Bard Mesh was used during the case/i);
    expect(lines[0]).toMatch(/— seen in 3 of 4 observations$/);
  });

  it("uses the fraction for workflow findings too", () => {
    const lines = buildWhatWeKnowLines({
      findings: [
        finding({
          label: "Visualization challenge before fixation",
          matchKey: "visualization before fixation",
          normalizedFindingId: "workflow_visualization_before_fixation",
          observationCount: 2,
          completedObservationCount: 2,
          evidenceLabel: "Observed in 2 cases",
          sourceCaseIds: ["case-a", "case-b"],
        }),
      ],
      providerName: null,
      programCompletedCount: 4,
      countStyle: "program_fraction",
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/visualization before fixation/i);
    expect(lines[0]).toMatch(/— seen in 2 of 4 observations$/);
  });

  it("keeps legacy single-case phrasing when only one completed observation backs the finding", () => {
    const lines = buildWhatWeKnowLines({
      findings: [
        finding({
          observationCount: 1,
          completedObservationCount: 1,
          evidenceLabel: "Observed in 1 case",
          sourceCaseIds: ["case-a"],
        }),
      ],
      providerName: null,
      programCompletedCount: 3,
      countStyle: "program_fraction",
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/in 1 completed case/);
    expect(lines[0]).not.toMatch(/seen in/);
  });

  it("default count style remains byte-identical legacy phrasing", () => {
    const lines = buildWhatWeKnowLines({
      findings: [finding({})],
      providerName: "Dr. Lettuce",
      programCompletedCount: 4,
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/across 3 completed cases/);
    expect(lines[0]).not.toMatch(/seen in/);
  });
});
