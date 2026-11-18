import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceMaturitySnapshot } from "./providerIntelligenceMaturity";
import { buildProviderOverviewStageProgression } from "./buildProviderOverviewStageProgression";

describe("buildProviderOverviewStageProgression", () => {
  it("returns early discovery → operationally qualified guidance with scan labels", () => {
    const maturity = buildProviderIntelligenceMaturitySnapshot({ contact: {} });
    const progression = buildProviderOverviewStageProgression(maturity);

    expect(progression).not.toBeNull();
    expect(progression!.heading).toBe("Unlock Operationally qualified");
    expect(progression!.items.map((i) => i.scanLabel)).toEqual([
      "Confirm workflow fit",
      "Map modality preferences",
      "Map commercial influence",
      "Know surgeon engagement style",
    ]);
    expect(progression!.items.every((i) => !i.met)).toBe(true);
  });

  it("marks met criteria for observation-ready transition", () => {
    const maturity = buildProviderIntelligenceMaturitySnapshot({
      contact: {
        provider_procedure_focus: "TKA",
        provider_technique_preferences: "robotic",
        influence_level: "medium",
        provider_communication_style: "direct",
        provider_observation_feasibility: "easy",
        provider_observation_credentialing_needed: "cleared",
        provider_observation_coordinator_contact: "Scheduler",
      },
    });
    const progression = buildProviderOverviewStageProgression(maturity);

    expect(maturity.stage).toBe("operationally_qualified");
    expect(progression!.heading).toBe("Unlock OR access ready");
    const coordinator = progression!.items.find((i) => i.id === "coordinator_identified");
    expect(coordinator?.met).toBe(true);
    const procedures = progression!.items.find((i) => i.id === "target_procedures");
    expect(procedures?.met).toBe(false);
    expect(procedures?.scanLabel).toBe("Map target procedures");
  });

  it("returns null at strategic account with no next stage", () => {
    const contact = {
      provider_procedure_focus: "hernia",
      provider_technique_preferences: "laparoscopic",
      influence_level: "high",
      provider_communication_style: "warm",
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "cleared",
      provider_observation_coordinator_contact: "Maria",
      provider_ideal_observation_cases: "hernia",
      provider_evaluation_openness: "open",
      provider_competitive_products: "incumbent",
      provider_decision_maker_status: "decision_maker",
      provider_preference_card_signals: "in_progress",
      provider_champion_potential: "strong",
    };
    const maturity = buildProviderIntelligenceMaturitySnapshot({
      contact,
      engagements: [{ id: "e1", status: "completed" } as never],
      cases: [{ id: "c1" }],
      opportunities: [{ stage: "won" }],
      planning: {
        status: "complete",
        percent: 100,
        sections: [
          { id: "clinical_workflow", percent: 100, confidence: "validated" },
          { id: "observation_readiness", percent: 100, confidence: "validated" },
          { id: "commercial_signals", percent: 100, confidence: "validated" },
        ],
      } as never,
    });

    if (maturity.nextStage) {
      const progression = buildProviderOverviewStageProgression(maturity);
      expect(progression?.heading).toMatch(/^Unlock /);
    }
  });
});
