import { describe, expect, it } from "vitest";
import { buildProviderOverviewNarrative } from "./buildProviderOverviewNarrative";

describe("buildProviderOverviewNarrative", () => {
  it("returns briefing → strategy → next step shape for early prospect", () => {
    const view = buildProviderOverviewNarrative({
      providerId: "p1",
      contact: { provider_relationship_stage: "prospect" },
      relationshipStage: "prospect",
      engagements: [],
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      newCaseHref: "/portal/sales/cases/new?surgeon_contact_id=p1",
      intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
      createOpportunityHref: "/portal/sales/opportunities/new?provider_id=p1",
    });

    expect(view.stageLabel).toBe("Early discovery");
    expect(view.commandSummary.maturityStage.length).toBeGreaterThan(3);
    expect(view.commandSummary.stageProgression?.heading).toMatch(/Operationally qualified/);
    expect(view.commandSummary.recommendedNextStep.length).toBeGreaterThan(10);
    expect(Array.isArray(view.strategyGaps)).toBe(true);
    expect(Array.isArray(view.operationalRisks)).toBe(true);
    expect(view.momentum.label).toBe("Early Discovery");
    expect(view.momentum.summary.length).toBeGreaterThan(10);
    expect(view.briefing.lead.length).toBeGreaterThan(10);
    expect(view.nextStep.primaryAction.label.length).toBeGreaterThan(0);
    expect(view.fieldEfficiency.primary.headline.length).toBeGreaterThan(5);
    expect(Array.isArray(view.discoveryAreas)).toBe(true);
    expect(view.executionBlockers).toBeDefined();
    expect(view.latestFieldIntelligence.length).toBeLessThanOrEqual(5);
    expect(view.commandSummary.deployment?.readiness.motions).toHaveLength(3);
    expect(view.observationFeasibility.title).toMatch(/OR entry/i);
    expect(view.observationFeasibility.kicker).toMatch(/OR entry/i);
    expect(view.accountMomentum.indicators.length).toBeGreaterThan(0);
    expect(view.missionControl).toBeDefined();
    expect(view.missionControl.scheduleEngagementHref).toContain("engagements/new");
    expect(view.showSection("upcoming_engagement")).toBe(true);
    expect(view.showSection("cases_work")).toBe(false);
  });

  it("strips recommended next step from briefing lead", () => {
    const view = buildProviderOverviewNarrative({
      providerId: "p1",
      contact: { provider_relationship_stage: "prospect" },
      relationshipStage: "prospect",
      engagements: [],
      newEngagementHref: "/engagements/new",
      newCaseHref: "/cases/new",
      intelligenceHref: "/intelligence",
      createOpportunityHref: "/opportunities/new",
    });
    expect(view.briefing.lead).not.toMatch(/Recommended next step/i);
    expect(view.workStreams).toHaveLength(0);
  });
});
