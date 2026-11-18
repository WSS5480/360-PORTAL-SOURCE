import { describe, expect, it } from "vitest";

import { OBSERVATION_INTELLIGENCE_TORTURE_CASES } from "./observationIntelligenceTortureCases";
import {
  formatTortureSuiteReport,
  meetsObservationTorturePassRate,
  OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE,
  runObservationTortureSuite,
} from "./runObservationTortureSuite";

describe("observation intelligence torture validation suite", () => {
  it("defines exactly 100 realistic dictation torture cases", () => {
    expect(OBSERVATION_INTELLIGENCE_TORTURE_CASES).toHaveLength(100);
    expect(new Set(OBSERVATION_INTELLIGENCE_TORTURE_CASES.map((entry) => entry.id)).size).toBe(100);
  });

  it("passes the torture suite at the required accuracy threshold", () => {
    const suite = runObservationTortureSuite();

    if (!meetsObservationTorturePassRate(suite)) {
      expect.fail(formatTortureSuiteReport(suite));
    }

    expect(suite.passRate).toBeGreaterThanOrEqual(OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE);
    expect(suite.passed).toBeGreaterThanOrEqual(Math.ceil(suite.total * OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE));
  });
});
