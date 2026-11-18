import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import { buildDiscoveryOverviewReadinessGroup } from "./buildDiscoveryOverviewReadinessGroup";
import { DISCOVERY_OVERVIEW_GROUP_COPY } from "./providerOverviewBriefingCopy";

describe("buildDiscoveryOverviewReadinessGroup", () => {
  it("builds narrative, blocker, and quick actions for access readiness", () => {
    const intelligenceView = buildDiscoveryIntelligenceGroupsView({
      contact: {
        provider_relationship_stage: "prospect",
        provider_observation_feasibility: "restricted",
      },
      relationshipStage: "prospect",
    });
    const intelGroup = intelligenceView.groups.find((g) => g.id === "access_readiness")!;

    const card = buildDiscoveryOverviewReadinessGroup({
      id: "access_readiness",
      title: DISCOVERY_OVERVIEW_GROUP_COPY.access_readiness.title,
      subtitle: DISCOVERY_OVERVIEW_GROUP_COPY.access_readiness.subtitle,
      summary: "Provider observation approval pending",
      intelGroup,
      contact: {
        provider_relationship_stage: "prospect",
        provider_observation_feasibility: "restricted",
      },
    });

    expect(card.blockers).toContain("Approval unconfirmed");
    expect(card.primaryAction).toBeTruthy();
    expect(card.primaryActionLabel).toBeTruthy();
    expect(card.quickActions.length).toBeGreaterThan(0);
    expect(card.quickActions.length).toBeLessThanOrEqual(3);
    expect(card.signals.length).toBe(4);
    expect(card.signals[0]?.confidenceLabel).toBeTruthy();
  });
});
