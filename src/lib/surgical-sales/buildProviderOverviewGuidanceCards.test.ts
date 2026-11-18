import { describe, expect, it } from "vitest";
import { buildProviderOverviewGuidanceCards } from "./buildProviderOverviewGuidanceCards";
import type { CanonicalExecutionBlocker } from "./buildProviderCanonicalExecutionBlockers";

describe("buildProviderOverviewGuidanceCards", () => {
  const fieldTimeRisk = {
    state: "high_wasted_field_risk",
    guidanceScan: "Confirm access before traveling",
    protectFieldTime: {
      deploymentRecommendation: "Validate scheduling before deploy",
    },
  } as Parameters<typeof buildProviderOverviewGuidanceCards>[0]["fieldTimeRisk"];

  const blocker: CanonicalExecutionBlocker = {
    id: "gap:provider_observation_coordinator_contact",
    kind: "capture_before_deploy",
    headline: "OR access not confirmed",
    operationalImpact: "Scheduling ownership unclear",
    resolveScan: "Confirm OR scheduling workflow",
    sectionId: "observation_readiness",
    dbKey: "provider_observation_coordinator_contact",
    severity: null,
  };

  it("builds headline, explanation, and next move per card", () => {
    const cards = buildProviderOverviewGuidanceCards({
      blocker,
      operationalRiskLine: null,
      action: {
        support: "Schedule intro call while access is still thin.",
        ctaLabel: "Schedule intro call",
        ctaHref: "/engagements/new",
      },
      upcoming: null,
      status: { headline: "2 items still open", support: "3 of 5 areas look solid" },
      readinessSteps: [
        { id: "access", label: "Access", status: "open" },
        { id: "workflow", label: "Workflow", status: "complete" },
      ],
      fieldTimeRisk,
      includeNextMoveCard: true,
    });

    expect(cards.length).toBeGreaterThanOrEqual(2);
    const blockerCard = cards.find((c) => c.kind === "blocker");
    expect(blockerCard?.eyebrow).toBe("Operational risk");
    expect(blockerCard?.headline).toMatch(/OR access/i);
    expect(blockerCard?.explanation).toMatch(/scheduling owner|wasted/i);
    expect(blockerCard?.nextMove).toBe("");
    expect(blockerCard?.anchorsResolution).toBe(true);

    const nextCard = cards.find((c) => c.kind === "next_move");
    expect(nextCard?.nextMove).toBe("Schedule intro call");
    expect(nextCard?.ctaHref).toBe("/engagements/new");
  });

  it("omits readiness card when a blocker is present", () => {
    const cards = buildProviderOverviewGuidanceCards({
      blocker,
      operationalRiskLine: null,
      action: { support: null, ctaLabel: "Add note", ctaHref: "/notes" },
      upcoming: null,
      status: { headline: "1 item still open", support: null },
      readinessSteps: [{ id: "access", label: "Access", status: "open" }],
      fieldTimeRisk,
    });
    expect(cards.some((c) => c.kind === "readiness")).toBe(false);
  });
});
