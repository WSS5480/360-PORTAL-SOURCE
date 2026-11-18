import { describe, expect, it } from "vitest";
import { isDiscoveryAccessWorkflowComplete } from "./providerOverviewDiscoveryNextMove";
import {
  buildSalesPathwayTimeline,
  resolveSalesPathwayStage,
  SALES_PATHWAY_STAGE_LABELS,
} from "./providerSalesPathwayExecution";
import { discoveryAccessReadyContact } from "./salesPathwayTestFixtures";

describe("providerSalesPathwayExecution", () => {
  it("resolves discovery for early prospect", () => {
    expect(
      resolveSalesPathwayStage({
        relationshipStage: "early_discovery",
        engagements: [],
      }),
    ).toBe("discovery");
  });

  it("resolves observe when observation approval is validated on file", () => {
    const contact = discoveryAccessReadyContact();
    expect(isDiscoveryAccessWorkflowComplete(contact)).toBe(true);
    expect(
      resolveSalesPathwayStage({
        contact,
        engagements: [],
      }),
    ).toBe("observe");
  });

  it("does not advance on scheduled observation without approval", () => {
    expect(
      resolveSalesPathwayStage({
        contact: { provider_relationship_stage: "early_discovery" },
        engagements: [
          {
            id: "e1",
            engagement_type: "or_visit",
            status: "scheduled",
          },
        ],
      }),
    ).toBe("discovery");
  });

  it("builds six-phase timeline with current stage highlighted", () => {
    const phases = buildSalesPathwayTimeline("observe");
    expect(phases).toHaveLength(6);
    expect(phases.find((p) => p.id === "observe")?.status).toBe("current");
    expect(phases.find((p) => p.id === "discovery")?.status).toBe("complete");
    expect(SALES_PATHWAY_STAGE_LABELS.debrief).toBe("Debrief");
  });
});
