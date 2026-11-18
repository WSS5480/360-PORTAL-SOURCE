import { describe, expect, it } from "vitest";
import { buildProviderOverviewRailWhyNow } from "./buildProviderOverviewRailWhyNow";
import { DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE } from "./providerOverviewDiscoveryNextMove";

describe("buildProviderOverviewRailWhyNow", () => {
  it("returns approval-focused why-now before observation approval", () => {
    const line = buildProviderOverviewRailWhyNow({
      contact: { provider_relationship_stage: "prospect" },
      pathwayStageId: "discovery",
      nextBestActionDetail: null,
      nextMove: null,
    });
    expect(line).toBe(DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval);
  });

  it("falls back to next-best-action detail outside discovery", () => {
    const line = buildProviderOverviewRailWhyNow({
      contact: {},
      pathwayStageId: "clinical_validation",
      nextBestActionDetail: "Next field move: Confirm observation outcomes.",
      nextMove: null,
    });
    expect(line).toBe("Confirm observation outcomes.");
  });
});
