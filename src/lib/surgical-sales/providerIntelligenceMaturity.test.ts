import { describe, expect, it } from "vitest";
import { buildProviderPlanningCompletion } from "./providerPlanningCompletion";
import {
  buildProviderIntelligenceMaturitySnapshot,
  resolveProviderIntelligenceMaturityStage,
} from "./providerIntelligenceMaturity";

describe("providerIntelligenceMaturity", () => {
  it("starts at early discovery for empty profile", () => {
    expect(resolveProviderIntelligenceMaturityStage({ contact: {} })).toBe("early_discovery");
  });

  it("reaches observation ready when pathway criteria are met", () => {
    const contact = {
      provider_procedure_focus: "hernia,bariatric",
      provider_technique_preferences: "laparoscopic",
      influence_level: "high",
      provider_communication_style: "warm",
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "cleared",
      provider_observation_coordinator_contact: "Maria RN — maria@hospital.org",
      provider_ideal_observation_cases: "hernia|notes:Thursday cases",
    };
    const stage = resolveProviderIntelligenceMaturityStage({ contact });
    expect(stage).toBe("observation_ready");

    const snap = buildProviderIntelligenceMaturitySnapshot({ contact });
    expect(snap.stageLabel).toBe("Observation Ready");
    const criteria = snap.nextStageCriteria.map((c) => c.label);
    expect(criteria).toContain("Trial willingness captured");
  });

  it("surfaces unmet observation criteria while operationally qualified", () => {
    const contact = {
      provider_procedure_focus: "TKA",
      provider_technique_preferences: "robotic",
      influence_level: "medium",
      provider_communication_style: "direct",
      provider_observation_feasibility: "easy",
    };
    const snap = buildProviderIntelligenceMaturitySnapshot({ contact });
    expect(snap.stage).toBe("operationally_qualified");
    expect(snap.nextStage).toBe("observation_ready");
    const unmet = snap.nextStageCriteria.filter((c) => !c.met).map((c) => c.id);
    expect(unmet).toContain("coordinator_identified");
    expect(unmet).toContain("target_procedures");
  });

  it("elevates evaluation active from opportunity stage", () => {
    const contact = {
      provider_procedure_focus: "hernia",
      provider_technique_preferences: "laparoscopic",
      influence_level: "high",
      provider_communication_style: "warm",
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "pending",
      provider_observation_coordinator_contact: "Scheduler",
      provider_ideal_observation_cases: "hernia",
      provider_evaluation_openness: "open",
      provider_competitive_products: "incumbent_a",
      provider_decision_maker_status: "decision_maker",
    };
    const stage = resolveProviderIntelligenceMaturityStage({
      contact,
      opportunities: [{ stage: "evaluation_active" }],
    });
    expect(["evaluation_active", "adoption_building", "strategic_account"]).toContain(stage);
  });

  it("describes account evolution for early discovery", () => {
    const snap = buildProviderIntelligenceMaturitySnapshot({ contact: {} });
    expect(snap.evolutionLine).toMatch(/learning the account/i);
    expect(snap.nextStage).toBe("operationally_qualified");
  });
});
