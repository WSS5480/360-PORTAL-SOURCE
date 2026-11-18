import { describe, expect, it } from "vitest";
import { buildProviderOverviewMissionSummary } from "./buildProviderOverviewMissionSummary";
import { DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE } from "./providerOverviewDiscoveryNextMove";

describe("buildProviderOverviewMissionSummary", () => {
  it("returns gate-first status lines and recommended move for early discovery", () => {
    const summary = buildProviderOverviewMissionSummary({
      contact: { provider_relationship_stage: "prospect" },
      nextFieldMove: DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval,
    });

    expect(summary).not.toBeNull();
    expect(summary!.statusLines[0]).toBe("Observation access not confirmed");
    expect(summary!.statusLines.length).toBeLessThanOrEqual(3);
    expect(summary!.recommendedMove).toMatch(/validate provider willingness/i);
  });

  it("surfaces scheduling and champion gaps after approval", () => {
    const summary = buildProviderOverviewMissionSummary({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Test",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
        provider_relationship_stage: "prospect",
      },
      nextFieldMove: DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.schedulingOwner,
    });

    expect(summary!.statusLines).toContain("No scheduling owner identified");
    expect(summary!.recommendedMove).toMatch(/scheduling owner/i);
  });
});
