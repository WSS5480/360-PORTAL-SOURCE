import { describe, expect, it } from "vitest";
import { buildProviderDeploymentCockpitView } from "./buildProviderOverviewCommandCenterView";
import { buildProviderOverviewNarrative } from "./buildProviderOverviewNarrative";

describe("buildProviderDeploymentCockpitView", () => {
  it("returns five deployment layers without field-action queues", () => {
    const narrative = buildProviderOverviewNarrative({
      providerId: "p1",
      contact: {
        provider_relationship_stage: "prospect",
        provider_observation_feasibility: "unknown",
      },
      relationshipStage: "prospect",
      engagements: [],
      newEngagementHref: "/engagements/new",
      newCaseHref: "/cases/new",
      intelligenceHref: "/intelligence",
      createOpportunityHref: "/opportunities/new",
    });

    const view = buildProviderDeploymentCockpitView({
      narrative,
      contact: { provider_relationship_stage: "prospect" },
      intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
      engagements: [],
    });

    expect(Array.isArray(view.confirmedSoFar)).toBe(true);

    expect(view.command.headline).toBeTruthy();
    expect(view.action.ctaHref).toBeTruthy();
    expect(view.deploymentResolution.nextBestMove.length).toBeGreaterThan(10);
    expect(view.deploymentResolution.ctaLabel.length).toBeGreaterThan(3);
    expect(view.guidanceCards.some((c) => c.anchorsResolution)).toBe(
      Boolean(view.deploymentResolution.blockerHeadline),
    );
    expect(view.readinessSteps).toHaveLength(5);
    expect(view.statusPriorities.length).toBeLessThanOrEqual(3);
    expect("upcomingEngagement" in view).toBe(true);
  });
});
