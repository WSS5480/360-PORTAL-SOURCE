import { describe, expect, it } from "vitest";

import {
  loadIntelligenceRegressionFixtures,
  runIntelligenceRegressionSuite,
} from "@/lib/surgical-sales/intelligenceRegression/intelligenceRegressionRunner";

describe("intelligence rendered-output regression suite", () => {
  it("validates every fixture against the final rendered intelligence model", () => {
    const fixtures = loadIntelligenceRegressionFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(10);

    const report = runIntelligenceRegressionSuite(fixtures);
    const failureSummary = report.results
      .filter((result) => !result.passed)
      .map((result) => ({
        fixture: result.fixture.name,
        filePath: result.fixture.filePath,
        failures: result.failures,
        renderedText: result.rendered.renderedText,
      }));

    expect(failureSummary).toEqual([]);
    expect(report.passed).toBe(true);
  });
});
