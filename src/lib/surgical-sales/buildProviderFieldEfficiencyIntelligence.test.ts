import { describe, expect, it } from "vitest";
import { buildProviderFieldEfficiencyIntelligence } from "./buildProviderFieldEfficiencyIntelligence";
import { buildProviderOverviewQualitativeReadiness } from "./providerOverviewQualitativeReadiness";
import { resolveProviderCommercialWorkflowStage } from "./providerCommercialWorkflowStage";

function readinessFor(contact: Record<string, unknown>, relationshipStage: string) {
  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: [],
    cases: [],
    engagements: [],
  });
  return buildProviderOverviewQualitativeReadiness({
    contact,
    relationshipStage,
    commercialStage,
    engagements: [],
  });
}

describe("buildProviderFieldEfficiencyIntelligence", () => {
  it("anchors primary signal on field time risk", () => {
    const relationshipStage = "prospect";
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage,
      opportunities: [],
      cases: [],
      engagements: [],
    });
    const view = buildProviderFieldEfficiencyIntelligence({
      contact: { provider_relationship_stage: "prospect" },
      relationshipStage,
      commercialStage,
      engagements: [],
      readinessIndicators: readinessFor({ provider_relationship_stage: "prospect" }, relationshipStage),
    });

    expect(view.fieldTimeRisk.state).toBe("high_wasted_field_risk");
    expect(view.primary.headline).toBe(view.fieldTimeRisk.stateLabel);
    expect(view.primary.posture).toBe("hold_field");
  });

  it("surfaces remote validation when coordinator is open", () => {
    const relationshipStage = "observation_requested";
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage,
      opportunities: [],
      cases: [],
      engagements: [],
    });
    const view = buildProviderFieldEfficiencyIntelligence({
      contact: {
        provider_relationship_stage: relationshipStage,
        provider_observation_feasibility: "easy",
        provider_observation_access_path: "Coordinator approval required",
        provider_observation_coordinator_contact: "",
      },
      relationshipStage,
      commercialStage,
      engagements: [],
      readinessIndicators: readinessFor(
        {
          provider_relationship_stage: relationshipStage,
          provider_observation_feasibility: "easy",
        },
        relationshipStage,
      ),
    });

    expect(view.fieldTimeRisk.state).toBe("requires_remote_validation_first");
    expect(view.primary.posture).toBe("map_first");
    expect(view.fieldTimeRisk.inputs.find((i) => i.id === "coordinator_mapped")?.status).not.toBe("strong");
  });

  it("recommends efficient field target when observation pathway is mapped", () => {
    const relationshipStage = "observation_scheduled";
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage,
      opportunities: [],
      cases: [],
      engagements: [
        {
          id: "e1",
          engagement_type: "observation_request",
          status: "planned",
          scheduled_at: "2026-07-01T10:00:00Z",
        } as never,
      ],
    });
    const contact = {
      provider_relationship_stage: relationshipStage,
      provider_observation_feasibility: "easy",
      provider_observation_coordinator_contact: "Jane OR scheduler — ext 4412",
      provider_observation_access_path: "Coordinator posts cases Tuesday AM",
      provider_observation_cadence_preference: "Tues AM",
      provider_observation_best_days_case_types: "2 weeks out",
      provider_procedure_focus: "Lap chole",
      relationship_strength: "strong",
    };
    const view = buildProviderFieldEfficiencyIntelligence({
      contact,
      relationshipStage,
      commercialStage,
      engagements: [
        {
          id: "e1",
          engagement_type: "observation_request",
          engagement_type_label: "Observation request",
          status: "planned",
          status_label: "Planned",
          scheduled_at: "2026-07-01T10:00:00Z",
          pre_call_filled: 3,
          pre_call_total: 5,
          pre_call_complete: false,
          outcome_label: "",
        },
      ],
      readinessIndicators: readinessFor(contact, relationshipStage),
    });

    expect(view.fieldTimeRisk.state).toBe("efficient_field_target");
    expect(view.primary.posture).toBe("invest_field");
    expect(view.allocationScan).toMatch(/efficient field target/i);
  });

  it("blocks field investment when access pathway is blocked", () => {
    const relationshipStage = "observation_requested";
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage,
      opportunities: [],
      cases: [],
      engagements: [],
    });
    const view = buildProviderFieldEfficiencyIntelligence({
      contact: {
        provider_observation_feasibility: "restricted",
        provider_observation_access_path: "Committee gate — no vendor access without approval",
      },
      relationshipStage,
      commercialStage,
      engagements: [],
      readinessIndicators: readinessFor(
        {
          provider_observation_feasibility: "restricted",
          provider_observation_access_path: "Committee gate — no vendor access",
        },
        relationshipStage,
      ),
    });

    expect(view.fieldTimeRisk.state).toBe("high_wasted_field_risk");
    expect(view.primary.posture).toBe("hold_field");
  });
});
