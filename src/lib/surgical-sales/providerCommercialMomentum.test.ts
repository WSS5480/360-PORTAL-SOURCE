import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceSummaryView } from "./buildProviderIntelligenceSummaryView";
import { buildProviderPlanningCompletion } from "./providerPlanningCompletion";
import { resolveProviderCommercialMomentum } from "./providerCommercialMomentum";

describe("providerCommercialMomentum", () => {
  it("returns Early Discovery for new prospect with thin intelligence", () => {
    const planning = buildProviderPlanningCompletion({ contact: { provider_relationship_stage: "prospect" } });
    const intel = buildProviderIntelligenceSummaryView({
      contact: { provider_relationship_stage: "prospect" },
      planning,
    });
    const momentum = resolveProviderCommercialMomentum({
      contact: { provider_relationship_stage: "prospect" },
      relationshipStage: "prospect",
      planning,
      engagements: [],
      intelOverall: intel.overallStatus,
    });
    expect(momentum.state).toBe("early_discovery");
    expect(momentum.label).toBe("Early Discovery");
  });

  it("returns Observation Ready when observation is scheduled with readiness captured", () => {
    const contact = {
      provider_relationship_stage: "observation_scheduled",
      provider_observation_feasibility: "easy",
      provider_observation_access_path: "none",
    };
    const planning = buildProviderPlanningCompletion({ contact });
    const intel = buildProviderIntelligenceSummaryView({ contact, planning });
    const momentum = resolveProviderCommercialMomentum({
      contact,
      relationshipStage: "observation_scheduled",
      planning,
      engagements: [],
      intelOverall: intel.overallStatus,
    });
    expect(momentum.state).toBe("observation_ready");
  });

  it("returns Evaluation Risk when in evaluation with thin commercial signals", () => {
    const contact = { provider_relationship_stage: "active_relationship" };
    const planning = buildProviderPlanningCompletion({ contact });
    const intel = buildProviderIntelligenceSummaryView({ contact, planning });
    const momentum = resolveProviderCommercialMomentum({
      contact,
      relationshipStage: "active_relationship",
      planning,
      engagements: [
        {
          id: "e1",
          status: "completed",
          engagement_type: "intro_call",
          engagement_type_label: "Intro",
          status_label: "Done",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: "",
        },
      ],
      intelOverall: intel.overallStatus,
    });
    expect(momentum.state).toBe("evaluation_risk");
    expect(momentum.summary).toMatch(/evaluation/i);
  });

  it("returns Expansion Opportunity for established customer with adoption-expanding initiative", () => {
    const contact = { provider_relationship_stage: "established_customer" };
    const planning = buildProviderPlanningCompletion({ contact });
    const intel = buildProviderIntelligenceSummaryView({ contact, planning });
    const momentum = resolveProviderCommercialMomentum({
      contact,
      relationshipStage: "established_customer",
      planning,
      engagements: [],
      opportunities: [{ id: "o1", stage: "adoption_expanding" }],
      cases: [{ id: "c1" }],
      intelOverall: "Strong",
      intelProductStatus: "Strong",
    });
    expect(momentum.state).toBe("expansion_opportunity");
  });
});
