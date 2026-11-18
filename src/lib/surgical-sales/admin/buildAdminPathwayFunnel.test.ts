import { describe, expect, it } from "vitest";
import {
  adminFunnelStageFromPathway,
  buildAdminPathwayFunnel,
} from "@/lib/surgical-sales/admin/buildAdminPathwayFunnel";

describe("buildAdminPathwayFunnel", () => {
  it("rolls debrief into observation and tracks debrief sublabel", () => {
    const funnel = buildAdminPathwayFunnel([
      { providerId: "a", currentStage: "discovery" },
      { providerId: "b", currentStage: "observe" },
      { providerId: "c", currentStage: "debrief" },
      { providerId: "d", currentStage: "evaluation" },
      { providerId: "e", currentStage: "commitment" },
      { providerId: "f", currentStage: "outcomes" },
    ]);

    expect(funnel.find((s) => s.stage_id === "discovery")?.provider_count).toBe(1);
    expect(funnel.find((s) => s.stage_id === "observation")?.provider_count).toBe(2);
    expect(funnel.find((s) => s.stage_id === "observation")?.sublabel).toBe("1 in debrief");
    expect(funnel.find((s) => s.stage_id === "evaluation")?.provider_count).toBe(1);
    expect(funnel.find((s) => s.stage_id === "commitment")?.provider_count).toBe(1);
    expect(funnel.find((s) => s.stage_id === "outcomes")?.provider_count).toBe(1);
  });

  it("maps pathway stages to funnel segments", () => {
    expect(adminFunnelStageFromPathway("observe")).toBe("observation");
    expect(adminFunnelStageFromPathway("debrief")).toBe("observation");
    expect(adminFunnelStageFromPathway("commitment")).toBe("commitment");
  });
});
