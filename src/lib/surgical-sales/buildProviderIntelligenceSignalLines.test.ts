import { describe, expect, it } from "vitest";

import type { AggregatedFindingEvidence } from "./observationFindingEvidenceConfidence";
import {
  buildProviderIntelligenceSignalLines,
  formatProviderIntelligenceSignalLine,
  formatWhatWeKnowLine,
} from "./observationRepPresentationCopy";

function mockFinding(
  overrides: Partial<AggregatedFindingEvidence> = {},
): AggregatedFindingEvidence {
  return {
    label: "Provider concern: Clinical Frustration",
    matchKey: "provider_frustration",
    normalizedFindingId: "provider_frustration",
    observationCount: 2,
    completedObservationCount: 2,
    capturedFromCurrentNote: false,
    isPositiveStaffSignal: false,
    isEarlySignal: false,
    confidence: "Medium",
    evidenceLabel: "Observed across 2 completed cases",
    sourceCaseIds: ["case-1", "case-2"],
    maturityStatus: "repeated_signal",
    ...overrides,
  };
}

describe("formatProviderIntelligenceSignalLine", () => {
  it("uses specific visualization context when evidence includes it", () => {
    const line = formatProviderIntelligenceSignalLine(
      mockFinding({
        label: "Provider concern: Clinical Frustration",
        live_observation_clinical_pain_points: undefined,
      }),
      "John Apple",
    );

    // Simulate visualization context in the canonical label path used by extraction
    const withVisualization = formatProviderIntelligenceSignalLine(
      mockFinding({
        label: "Provider frustration during visualization before fixation",
        normalizedFindingId: "provider_frustration",
      }),
      "John Apple",
    );

    expect(withVisualization).toMatch(
      /John Apple expressed frustration during visualization\/fixation decision-making/i,
    );
    expect(withVisualization).toMatch(/across 2 completed cases/i);
    expect(withVisualization).not.toMatch(/frustration during cases/i);
    expect(line).not.toMatch(/concern around frustration during cases/i);
  });

  it("falls back to case-level frustration when context is unavailable", () => {
    const line = formatProviderIntelligenceSignalLine(mockFinding(), "John Apple");

    expect(line).toMatch(/John Apple expressed frustration during the case/i);
    expect(line).toMatch(/across 2 completed cases/i);
    expect(line).not.toMatch(/frustration during cases/i);
    expect(line).not.toMatch(/concern around/i);
  });

  it("preserves staff product availability context", () => {
    const line = formatProviderIntelligenceSignalLine(
      mockFinding({
        label: "Staff burden: Uncertainty Stocked Products",
        normalizedFindingId: "staff_friction",
        matchKey: "staff_friction",
      }),
      null,
    );

    expect(line).toMatch(/Staff had to verify products were stocked before the case could proceed/i);
    expect(line).not.toMatch(/frustration during cases/i);
    expect(line).not.toMatch(/product availability observed/i);
  });

  it("uses the same rep story on observation and provider intelligence surfaces", () => {
    const finding = mockFinding();
    const observationLine = formatWhatWeKnowLine(finding, "John Apple", undefined, [finding]);
    const providerLine = formatProviderIntelligenceSignalLine(finding, "John Apple", [finding]);

    expect(observationLine).toMatch(/John Apple expressed frustration during the case/i);
    expect(providerLine).toBe(observationLine);
    expect(observationLine).not.toMatch(/concern around frustration during cases/i);
  });

  it("buildProviderIntelligenceSignalLines omits vague frustration-only phrases", () => {
    const lines = buildProviderIntelligenceSignalLines({
      providerName: "John Apple",
      findings: [
        mockFinding({
          label: "Provider frustration during visualization before fixation",
        }),
      ],
    });

    expect(lines.join("\n")).toMatch(/visualization\/fixation decision-making/i);
    expect(lines.join("\n")).not.toMatch(/frustration during cases/i);
  });

  it("infers frustration context from co-occurring workflow findings", () => {
    const line = formatProviderIntelligenceSignalLine(
      mockFinding({
        label: "Provider concern: Clinical Frustration",
        normalizedFindingId: "provider_frustration",
      }),
      "John Apple",
      [
        mockFinding({
          label: "Visualization before fixation observed",
          normalizedFindingId: "workflow_visualization_before_fixation",
          matchKey: "workflow_visualization_before_fixation",
          maturityStatus: "captured_signal",
        }),
      ],
    );

    expect(line).toMatch(
      /John Apple expressed frustration during visualization\/fixation decision-making/i,
    );
    expect(line).not.toMatch(/frustration during the case/i);
  });
});
