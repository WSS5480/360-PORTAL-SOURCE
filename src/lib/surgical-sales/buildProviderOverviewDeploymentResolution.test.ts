import { describe, expect, it } from "vitest";
import { buildProviderOverviewDeploymentResolution } from "./buildProviderOverviewDeploymentResolution";
import type { CanonicalExecutionBlocker } from "./buildProviderCanonicalExecutionBlockers";

describe("buildProviderOverviewDeploymentResolution", () => {
  const fieldTimeRisk = {
    state: "high_wasted_field_risk",
    guidanceScan: "Confirm access before traveling",
    primaryDbKey: "provider_observation_coordinator_contact",
    narrative: {
      reducers: [
        {
          reducerSignal: "Confirm who owns the OR calendar and posting handoff.",
          dbKey: "provider_observation_coordinator_contact",
        },
      ],
    },
    protectFieldTime: {},
  } as Parameters<typeof buildProviderOverviewDeploymentResolution>[0]["fieldTimeRisk"];

  const blocker: CanonicalExecutionBlocker = {
    id: "gap:provider_observation_coordinator_contact",
    kind: "capture_before_deploy",
    headline: "Scheduling owner not named",
    operationalImpact: "Case day may be wasted without a scheduling owner.",
    resolveScan: "Confirm OR scheduling workflow",
    sectionId: "observation_readiness",
    dbKey: "provider_observation_coordinator_contact",
    severity: null,
    fieldGuidance: {
      bestSource: "OR scheduler",
      bestInteraction: "Scheduling owner introduction",
      idealTiming: "Before holding first observation slot",
    },
  };

  it("ties CTA to blocker with next best move and best source", () => {
    const resolution = buildProviderOverviewDeploymentResolution({
      blocker,
      fieldTimeRisk,
      primaryAction: {
        label: "Schedule intro call",
        href: "/engagements/new",
        reason: "Early relationship",
      },
      contact: {},
      intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
    });

    expect(resolution.blockerHeadline).toMatch(/scheduling owner/i);
    expect(resolution.nextBestMove).toMatch(/scheduling and posting/i);
    expect(resolution.whyItMatters).toMatch(/scheduling owner|wasted/i);
    expect(resolution.bestSource).toMatch(/OR scheduler or office coordinator/i);
    expect(resolution.ctaLabel).toMatch(/OR scheduling owner/i);
    expect(resolution.ctaHref).toContain("planning_section=observation_readiness");
  });
});
