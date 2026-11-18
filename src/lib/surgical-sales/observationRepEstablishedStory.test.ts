import { describe, expect, it } from "vitest";

import type { AggregatedFindingEvidence } from "./observationFindingEvidenceConfidence";
import {
  formatRepEstablishedFindingStory,
  formatWhatWeKnowLine,
  isVagueRepStoryLabel,
  REP_STORY_BANNED_PATTERNS,
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

function assertNoBannedPatterns(line: string) {
  for (const pattern of REP_STORY_BANNED_PATTERNS) {
    expect(line).not.toMatch(pattern);
  }
}

describe("formatRepEstablishedFindingStory", () => {
  it.each([
    {
      name: "provider frustration with visualization context",
      finding: mockFinding({
        label: "Provider frustration during visualization before fixation",
      }),
      peers: [] as AggregatedFindingEvidence[],
      providerName: "John Apple",
      expected: /John Apple expressed frustration during visualization\/fixation decision-making/i,
    },
    {
      name: "provider frustration inferred from workflow peer",
      finding: mockFinding({ label: "Provider concern: Clinical Frustration" }),
      peers: [
        mockFinding({
          label: "Visualization before fixation observed",
          normalizedFindingId: "workflow_visualization_before_fixation",
          matchKey: "workflow_visualization_before_fixation",
          maturityStatus: "captured_signal",
        }),
      ],
      providerName: "John Apple",
      expected: /John Apple expressed frustration during visualization\/fixation decision-making/i,
    },
    {
      name: "staff product stocking verification",
      finding: mockFinding({
        label: "Staff burden: Uncertainty Stocked Products",
        normalizedFindingId: "staff_friction",
        matchKey: "staff_friction",
      }),
      peers: [],
      providerName: null,
      expected: /Staff had to verify products were stocked before the case could proceed/i,
    },
    {
      name: "workflow visualization before fixation",
      finding: mockFinding({
        label: "Visualization challenge before fixation",
        normalizedFindingId: "workflow_visualization_before_fixation",
        matchKey: "workflow_visualization_before_fixation",
      }),
      peers: [],
      providerName: null,
      expected: /Extra time was spent improving visualization before fixation/i,
    },
    {
      name: "product in use",
      finding: mockFinding({
        label: "Bard Mesh observed",
        normalizedFindingId: "product_in_use:bard mesh",
        matchKey: "product_in_use:bard mesh",
      }),
      peers: [],
      providerName: null,
      expected: /Bard Mesh was used during the case/i,
    },
  ])("$name", ({ finding, peers, providerName, expected }) => {
    const line = formatRepEstablishedFindingStory(finding, {
      surface: "intelligence",
      providerName,
      peerFindings: peers,
    });
    expect(line).toMatch(expected);
    assertNoBannedPatterns(line);
  });

  it("uses briefing count suffix without changing the story", () => {
    const finding = mockFinding({
      label: "Staff burden: Uncertainty Stocked Products",
      normalizedFindingId: "staff_friction",
      matchKey: "staff_friction",
    });
    const intelligence = formatRepEstablishedFindingStory(finding, {
      surface: "intelligence",
      peerFindings: [finding],
    });
    const briefing = formatRepEstablishedFindingStory(finding, {
      surface: "briefing",
      peerFindings: [finding],
    });

    expect(intelligence).toMatch(/across 2 completed cases/i);
    expect(briefing).toMatch(/across 2 completed observations/i);
    expect(briefing.replace(/ across 2 completed observations$/i, "")).toBe(
      intelligence.replace(/ across 2 completed cases$/i, ""),
    );
  });

  it("omits vague-only labels without resolvable context", () => {
    const line = formatWhatWeKnowLine(
      mockFinding({
        label: "workflow delays",
        normalizedFindingId: "workflow_delay",
        matchKey: "workflow_delay",
      }),
      null,
      undefined,
      [],
    );
    expect(line).toMatch(/Case flow slowed due to workflow delays/i);
    assertNoBannedPatterns(line);
  });

  it("flags vague rep story labels", () => {
    expect(isVagueRepStoryLabel("product availability")).toBe(true);
    expect(isVagueRepStoryLabel("frustration during cases")).toBe(true);
    expect(isVagueRepStoryLabel("visualization before fixation")).toBe(false);
  });
});
