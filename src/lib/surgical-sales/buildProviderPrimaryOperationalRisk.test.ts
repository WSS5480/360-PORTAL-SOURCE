import { describe, expect, it } from "vitest";
import { buildProviderPrimaryOperationalRisk } from "./buildProviderPrimaryOperationalRisk";

describe("buildProviderPrimaryOperationalRisk", () => {
  it("returns scheduling authority risk for thin prospect", () => {
    const risk = buildProviderPrimaryOperationalRisk({
      contact: { provider_relationship_stage: "prospect" },
      planning: {
        sections: [
          {
            id: "observation_readiness",
            label: "Observation",
            confidence: "unknown",
            captured_count: 0,
            total_count: 8,
            last_updated_at: null,
          },
          {
            id: "clinical_workflow",
            label: "Clinical",
            confidence: "unknown",
            captured_count: 0,
            total_count: 5,
            last_updated_at: null,
          },
          {
            id: "or_environment",
            label: "OR",
            confidence: "unknown",
            captured_count: 0,
            total_count: 4,
            last_updated_at: null,
          },
          {
            id: "relationship_intelligence",
            label: "Relationship",
            confidence: "unknown",
            captured_count: 0,
            total_count: 6,
            last_updated_at: null,
          },
          {
            id: "commercial_signals",
            label: "Commercial",
            confidence: "unknown",
            captured_count: 0,
            total_count: 4,
            last_updated_at: null,
          },
        ],
      },
      relationshipStage: "prospect",
      engagements: [],
    });

    expect(risk).not.toBeNull();
    expect(risk!.headline).toMatch(/scheduling authority|clearance|Procedure mix|access/i);
    expect(risk!.headline.length).toBeLessThan(60);
    expect(risk!.cta?.sectionId).toBeTruthy();
  });

  it("returns commercial influence headline during evaluation when commercial is thin", () => {
    const risk = buildProviderPrimaryOperationalRisk({
      contact: {
        provider_relationship_stage: "active_relationship",
        provider_procedure_focus: "Hernia",
        provider_technique_preferences: "lap",
        provider_observation_feasibility: "easy",
        provider_observation_access_path: "coordinator",
        provider_observation_coordinator_contact: "Jane Scheduler",
        provider_observation_cadence_preference: "weekly",
      },
      planning: {
        sections: [
          {
            id: "observation_readiness",
            label: "Observation",
            confidence: "confirmed",
            captured_count: 5,
            total_count: 8,
            last_updated_at: null,
          },
          {
            id: "clinical_workflow",
            label: "Clinical",
            confidence: "confirmed",
            captured_count: 3,
            total_count: 5,
            last_updated_at: null,
          },
          {
            id: "or_environment",
            label: "OR",
            confidence: "partial",
            captured_count: 2,
            total_count: 4,
            last_updated_at: null,
          },
          {
            id: "relationship_intelligence",
            label: "Relationship",
            confidence: "partial",
            captured_count: 2,
            total_count: 6,
            last_updated_at: null,
          },
          {
            id: "commercial_signals",
            label: "Commercial",
            confidence: "unknown",
            captured_count: 0,
            total_count: 4,
            last_updated_at: null,
          },
        ],
      },
      relationshipStage: "active_relationship",
      opportunities: [{ stage: "evaluation_planned" }],
      engagements: [],
    });

    expect(risk).not.toBeNull();
    expect(risk!.headline).toMatch(/Commercial influence/i);
  });
});
