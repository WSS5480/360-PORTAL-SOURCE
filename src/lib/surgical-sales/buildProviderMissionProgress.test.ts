import { describe, expect, it } from "vitest";
import { buildProviderMissionProgress, missionProgressAtLeast } from "./buildProviderMissionProgress";
import {
  emptyProviderCommercialIntelligence,
} from "./providerCommercialIntelligenceModel";

describe("buildProviderMissionProgress", () => {
  it("starts at prospect with no commercial signals", () => {
    const progress = buildProviderMissionProgress({ contact: {} });
    expect(progress.levelId).toBe("prospect");
    expect(progress.advancement).toBe("early");
    expect(progress.primaryMilestoneMet).toBe(false);
    expect(progress.stageGateBlockers.length).toBeGreaterThan(0);
  });

  it("marks interested when observation interest is on file", () => {
    const progress = buildProviderMissionProgress({
      contact: { provider_observation_feasibility: "yes" },
    });
    expect(progress.levelId).toBe("interested");
    expect(missionProgressAtLeast(progress.levelId, "interested")).toBe(true);
  });

  it("marks approved when observation approval is validated — without scheduler", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.observation.interest = "yes";
    commercial.observation.approval_status = "approved";
    commercial.observation.access_status = "approved";

    const progress = buildProviderMissionProgress({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility: "yes",
      },
      stageId: "discovery",
    });

    expect(progress.levelId).toBe("approved");
    expect(progress.advancement).toBe("advancing");
    expect(progress.primaryMilestoneMet).toBe(true);
    expect(progress.stageGateBlockers).toEqual([]);
  });

  it("does not treat missing scheduler as a stage gate blocker when approved", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.observation.approval_status = "approved";

    const progress = buildProviderMissionProgress({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility: "yes",
      },
      stageId: "discovery",
    });

    expect(progress.primaryMilestoneMet).toBe(true);
    expect(progress.stageGateBlockers.some((b) => /scheduler|credential/i.test(b.label))).toBe(false);
  });

  it("marks observed after completed observation", () => {
    const progress = buildProviderMissionProgress({
      contact: { observation_count: 1 },
      cases: [{ id: "c1", case_type: "observation", status: "completed" }],
      stageId: "observe",
    });
    expect(progress.levelId).toBe("observed");
  });
});
