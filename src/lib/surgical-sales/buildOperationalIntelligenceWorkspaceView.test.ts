import { describe, expect, it } from "vitest";

import { buildOperationalIntelligenceWorkspaceView } from "./buildOperationalIntelligenceWorkspaceView";

describe("buildOperationalIntelligenceWorkspaceView", () => {
  it("builds six-section workspace without legacy failure copy", () => {
    const view = buildOperationalIntelligenceWorkspaceView({
      contact: {},
      planning: {
        sections: [],
        overall_percent: 0,
        overall_confidence: "unknown",
      } as never,
      providerId: "prov-1",
      maturitySnapshot: {
        stage: "early_discovery",
        stageLabel: "Early discovery",
        stageHint: "",
        evolutionLine: "",
        stageIndex: 0,
        nextStageCriteria: [],
        nextStage: null,
        nextStageLabel: null,
        progressToNextPercent: 0,
        unmetNextDbKeys: [],
      },
    });

    expect(view).not.toBeNull();
    expect(view!.header.title).toBe("Early discovery");
    expect(view!.header.subtitle).toMatch(/still developing/i);
    expect(view!.header.facilityConfidence).toBe("Developing");
    expect(view!.header.primaryCtaLabel).toBe("Build account intelligence");
    expect(JSON.stringify(view)).not.toMatch(/not viable|primary blocker|commercialization/i);
    expect(view!.validationQueue.length).toBeGreaterThan(0);
    expect(view!.facilityContext.lines.length).toBeGreaterThan(0);
    expect(view!.providerContext.lines.length).toBeGreaterThan(0);
    expect(view!.recommendedMoves).toHaveLength(3);
  });
});
