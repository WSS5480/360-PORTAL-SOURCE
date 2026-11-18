import { describe, expect, it } from "vitest";
import {
  buildPlaybookPathwayOutcomeStats,
  didPathwayAdvanceToNextStage,
  formatPlaybookNextStageConversionRatio,
} from "./playbookPathwayOutcome";

describe("didPathwayAdvanceToNextStage", () => {
  it("counts discovery → observe as success", () => {
    expect(didPathwayAdvanceToNextStage("discovery", "observe")).toBe(true);
  });

  it("rejects unchanged stage", () => {
    expect(didPathwayAdvanceToNextStage("discovery", "discovery")).toBe(false);
  });

  it("rejects skipping stages", () => {
    expect(didPathwayAdvanceToNextStage("discovery", "evaluation")).toBe(false);
  });

  it("rejects outcomes terminal stage", () => {
    expect(didPathwayAdvanceToNextStage("outcomes", "outcomes")).toBe(false);
  });
});

describe("buildPlaybookPathwayOutcomeStats", () => {
  it("computes conversion ratio from successes and non-advances", () => {
    expect(buildPlaybookPathwayOutcomeStats(3, 1)).toEqual({
      successCount: 3,
      noAdvanceCount: 1,
      completedCount: 4,
      conversionRatio: 0.75,
    });
  });

  it("returns null conversion when no completed outcomes", () => {
    expect(buildPlaybookPathwayOutcomeStats(0, 0).conversionRatio).toBeNull();
  });
});

describe("formatPlaybookNextStageConversionRatio", () => {
  it("formats ratio as a whole percent", () => {
    expect(formatPlaybookNextStageConversionRatio(0.625)).toBe("63%");
  });

  it("shows em dash when no data", () => {
    expect(formatPlaybookNextStageConversionRatio(null)).toBe("—");
  });
});
