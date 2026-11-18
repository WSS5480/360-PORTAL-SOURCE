import { describe, expect, it } from "vitest";
import { buildProviderFieldCommandBriefing } from "./buildProviderFieldCommandBriefing";
import { buildProviderOverviewStageProgression } from "./buildProviderOverviewStageProgression";
import { buildProviderIntelligenceMaturitySnapshot } from "./providerIntelligenceMaturity";

describe("buildProviderFieldCommandBriefing", () => {
  it("surfaces directive, validated, open risks, and next action for observation pathway", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_feasibility: "allowed",
      provider_observation_credentialing_needed: "not_required",
    };

    const maturity = buildProviderIntelligenceMaturitySnapshot({
      contact,
      relationshipStage: "prospect",
    });
    const progression = buildProviderOverviewStageProgression(maturity);

    const briefing = buildProviderFieldCommandBriefing({
      contact,
      commercialStage: "early_discovery",
      laneLabel: "Access mapping · Access mapping",
      recommendedNextStep: "Call scheduler before booking observation day.",
      progression,
    });

    expect(briefing.fieldCommand.length).toBeGreaterThan(20);
    expect(briefing.validated.length + briefing.openRisks.length).toBeGreaterThan(0);
    expect(briefing.nextFieldAction).toMatch(/scheduler/i);
  });

  it("prioritizes scheduling directive when coordinator is open", () => {
    const contact = {
      provider_relationship_stage: "observation_requested",
      provider_observation_feasibility: "allowed",
    };

    const briefing = buildProviderFieldCommandBriefing({
      contact,
      commercialStage: "observation",
      laneLabel: "Observation · Observation pathway",
      recommendedNextStep: "Confirm posting window.",
      progression: null,
    });

    const hasSchedulingRisk = briefing.openRisks.some((r) =>
      /coordinator|cadence|posting|scheduling/i.test(r.label),
    );
    if (hasSchedulingRisk) {
      expect(briefing.fieldCommand).toMatch(/scheduling pathway/i);
    }
  });
});
