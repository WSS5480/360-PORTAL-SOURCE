import { describe, expect, it } from "vitest";
import {
  buildUncertaintyCardSummaryLines,
  UNCERTAINTY_SUMMARY_LINES_MAX,
} from "./accountUnderstandingUncertaintyDetail";

describe("accountUnderstandingUncertaintyDetail", () => {
  it("caps collapsed summary at four lines", () => {
    const lines = buildUncertaintyCardSummaryLines({
      primaryUnknown: "Who owns OR scheduling still unclear.",
      bestSource: "OR scheduler or coordinator",
      nextMove: "Confirm OR scheduling owner",
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(UNCERTAINTY_SUMMARY_LINES_MAX);
    expect(lines[0]).toMatch(/scheduling/i);
  });
});
