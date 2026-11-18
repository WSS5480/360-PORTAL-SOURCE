import { describe, expect, it } from "vitest";

import {
  formatIntelligenceStrengthDisplay,
  formatIntelligenceTrackDetail,
  formatMissingAreasSummary,
  formatPlanningStripMeta,
  PROVIDER_INTELLIGENCE_UI,
} from "./providerIntelligenceDisplayLabels";

describe("providerIntelligenceDisplayLabels", () => {
  it("exposes commercial intelligence surface copy", () => {
    expect(PROVIDER_INTELLIGENCE_UI.expandCta).toBe("Open deployment brief");
    expect(PROVIDER_INTELLIGENCE_UI.nextMoveLabel).toBe("Next field move");
  });

  it("maps strength labels for reps", () => {
    expect(formatIntelligenceStrengthDisplay("Limited", "chip")).toBe("Developing visibility");
    expect(formatIntelligenceStrengthDisplay("Building", "chip")).toBe("Map building");
    expect(formatIntelligenceStrengthDisplay("Strong", "chip")).toBe("Operationally clear");
    expect(formatIntelligenceStrengthDisplay("Building")).toBe("Map building");
    expect(formatIntelligenceStrengthDisplay("Strong", "overall")).toBe("Operationally clear");
    expect(formatIntelligenceStrengthDisplay("Limited", "overall")).toBe("Developing visibility");
  });

  it("uses strategic track detail copy", () => {
    expect(formatIntelligenceTrackDetail("clinical", "Limited", 0, 10)).toContain("workflow");
    expect(formatIntelligenceTrackDetail("clinical", "Building", 2, 10)).toContain("partial");
    expect(formatIntelligenceTrackDetail("clinical", "Limited", 0, 0)).not.toContain("gaps");
  });

  it("formats missing areas without admin jargon", () => {
    const line = formatMissingAreasSummary(["procedure focus", "current product usage"]);
    expect(line).toContain("Still open:");
    expect(line).not.toContain("Discovery needed on");
    expect(line).not.toContain("Gaps");
  });

  it("formats planning strip with learning gaps when contact provided", () => {
    const meta = formatPlanningStripMeta(
      {
        status: "in_progress",
        sections_complete: 0,
        sections_total: 5,
      },
      {},
    );
    expect(meta).toContain("Operational map in progress");
    expect(meta).not.toMatch(/\d+\s*\/\s*\d+/);
    expect(meta.length).toBeGreaterThan(20);
  });
});
