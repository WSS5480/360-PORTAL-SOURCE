import { describe, expect, it } from "vitest";

import { OBSERVATION_INTELLIGENCE_ALL_TEST_CASES } from "./observationIntelligenceTestCases";
import {
  formatObservationIntelligenceTestMismatch,
  meetsObservationIntelligencePassRate,
  OBSERVATION_INTELLIGENCE_MIN_PASS_RATE,
  runObservationIntelligenceTestSuite,
} from "./runObservationIntelligenceTestSuite";
import type { ObservationFact } from "../observationFactTypes";

const MOCK_LLM_RESPONSES: Record<string, ObservationFact[]> = {
  "Bard Mesh is on the preference card for these hernia cases.": [
    {
      type: "current_product",
      value: "Bard Mesh",
      evidence: "Bard Mesh is on the preference card",
    },
    {
      type: "competitor_product",
      value: "Bard Mesh",
      evidence: "Bard Mesh is on the preference card",
    },
  ],
};

async function mockLlmExtractor(fragment: string): Promise<ObservationFact[]> {
  return MOCK_LLM_RESPONSES[fragment.trim()] ?? [];
}

describe("observation intelligence formal test suite", () => {
  it("defines at least 50 realistic observation test cases", () => {
    expect(OBSERVATION_INTELLIGENCE_ALL_TEST_CASES.length).toBeGreaterThanOrEqual(50);
  });

  it("passes rules-tier cases at an acceptable rate", async () => {
    const suite = await runObservationIntelligenceTestSuite({ includeHybrid: false });

    if (!meetsObservationIntelligencePassRate(suite)) {
      const failureReport = suite.results
        .filter((result) => !result.passed)
        .map((result) => {
          const mismatchLines = result.mismatches
            .map((mismatch) => `    - ${formatObservationIntelligenceTestMismatch(mismatch)}`)
            .join("\n");
          return `${result.id} (${result.name}) [${result.tier}]:\n${mismatchLines}`;
        })
        .join("\n\n");

      expect.fail(
        `${suite.failed}/${suite.total} cases failed (pass rate ${Math.round(suite.passRate * 100)}%, minimum ${Math.round(OBSERVATION_INTELLIGENCE_MIN_PASS_RATE * 100)}%):\n\n${failureReport}`,
      );
    }

    expect(meetsObservationIntelligencePassRate(suite)).toBe(true);
  });
});

describe("observation intelligence hybrid test tier", () => {
  it("passes hybrid-only cases with mocked LLM fallback", async () => {
    const suite = await runObservationIntelligenceTestSuite({
      includeHybrid: true,
      llmExtractor: mockLlmExtractor,
    });

    const hybridCases = suite.results.filter((result) => result.tier === "hybrid");
    const hybridFailures = hybridCases.filter((result) => !result.passed);

    if (hybridFailures.length > 0) {
      const failureReport = hybridFailures
        .map((result) => {
          const mismatchLines = result.mismatches
            .map((mismatch) => `    - ${formatObservationIntelligenceTestMismatch(mismatch)}`)
            .join("\n");
          return `${result.id} (${result.name}):\n${mismatchLines}`;
        })
        .join("\n\n");

      expect.fail(`Hybrid tier failures:\n\n${failureReport}`);
    }

    expect(hybridFailures.length).toBe(0);
  });

  it("meets combined pass rate with hybrid fallback enabled", async () => {
    const suite = await runObservationIntelligenceTestSuite({
      includeHybrid: true,
      llmExtractor: mockLlmExtractor,
    });

    expect(meetsObservationIntelligencePassRate(suite)).toBe(true);
  });
});
