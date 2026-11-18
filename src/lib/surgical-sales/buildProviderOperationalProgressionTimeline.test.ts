import { describe, expect, it } from "vitest";
import {
  buildProviderOperationalProgressionTimeline,
  resolveOperationalProgressionPhaseIndex,
} from "./buildProviderOperationalProgressionTimeline";
import { buildProviderIntelligenceMaturitySnapshot } from "./providerIntelligenceMaturity";
describe("buildProviderOperationalProgressionTimeline", () => {
  it("returns six phases in order", () => {
    const timeline = buildProviderOperationalProgressionTimeline({
      contact: {},
      relationshipStage: "prospect",
    });
    expect(timeline.phases.map((p) => p.label)).toEqual([
      "Early discovery",
      "Access mapping",
      "Observation validated",
      "Workflow aligned",
      "Evaluation-ready",
      "Commercialization-ready",
    ]);
  });

  it("highlights discovery for empty accounts", () => {
    const timeline = buildProviderOperationalProgressionTimeline({
      contact: {},
      relationshipStage: "prospect",
    });
    expect(timeline.currentPhaseId).toBe("discovery");
    expect(timeline.phases[0]?.status).toBe("current");
    expect(timeline.nextUnlockScan.length).toBeGreaterThan(0);
  });

  it("advances to observation feasible when observation path is mapped", () => {
    const contact = {
      provider_procedure_focus: "hernia",
      provider_technique_preferences: "lap",
      influence_level: "high",
      provider_communication_style: "email",
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "cleared",
      provider_observation_coordinator_contact: "Jane OR",
      provider_ideal_observation_cases: "lap chole",
    };
    const ctx = { contact, relationshipStage: "observation_requested" };
    const maturity = buildProviderIntelligenceMaturitySnapshot(ctx);
    const index = resolveOperationalProgressionPhaseIndex(maturity, ctx);
    expect(index).toBeGreaterThanOrEqual(2);
    const timeline = buildProviderOperationalProgressionTimeline(ctx);
    const current = timeline.phases.find((p) => p.status === "current");
    expect(current?.id).toMatch(/observation_feasible|workflow_validated|evaluation_ready/);
  });

  it("does not mark phases blocked for missing optional intelligence", () => {
    const timeline = buildProviderOperationalProgressionTimeline({
      contact: {},
      relationshipStage: "prospect",
    });
    expect(timeline.phases.some((p) => p.status === "blocked")).toBe(false);
    expect(timeline.blockedHeadline).toBeNull();
  });
});
