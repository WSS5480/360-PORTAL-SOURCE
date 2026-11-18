import { describe, expect, it } from "vitest";
import {
  FIELD_INTELLIGENCE_NOT_STARTED,
  providerHasFieldIntelligenceEvidence,
  resolveProviderFieldIntelligenceEvidence,
} from "./providerFieldIntelligenceEvidence";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";

function engagement(partial: Partial<ProviderEngagementSummary>): ProviderEngagementSummary {
  return {
    id: "eng-1",
    engagement_type: "intro_call",
    engagement_type_label: "Intro Call",
    status: "planned",
    status_label: "Planned",
    pre_call_filled: 0,
    pre_call_total: 5,
    pre_call_complete: false,
    outcome_label: "Planned",
    ...partial,
  };
}

describe("providerFieldIntelligenceEvidence", () => {
  it("returns false for brand-new providers with no field activity", () => {
    expect(providerHasFieldIntelligenceEvidence({ contact: {}, engagements: [], cases: [] })).toBe(
      false,
    );
    expect(resolveProviderFieldIntelligenceEvidence({ contact: {} }).sources).toEqual([]);
  });

  it("detects engagements as evidence", () => {
    const result = resolveProviderFieldIntelligenceEvidence({
      contact: {},
      engagements: [engagement({})],
    });
    expect(result.hasEvidence).toBe(true);
    expect(result.sources).toContain("engagements");
  });

  it("detects observation and product support cases", () => {
    expect(
      providerHasFieldIntelligenceEvidence({
        contact: {},
        cases: [{ case_type: "observation" }],
      }),
    ).toBe(true);
    expect(
      providerHasFieldIntelligenceEvidence({
        contact: {},
        cases: [{ case_type: "product_support" }],
      }),
    ).toBe(true);
  });

  it("detects debrief completion on engagements", () => {
    expect(
      providerHasFieldIntelligenceEvidence({
        contact: {},
        engagements: [engagement({ debrief_completed: true })],
      }),
    ).toBe(true);
  });

  it("detects field notes via metadata evidence", () => {
    expect(
      providerHasFieldIntelligenceEvidence({
        contact: {
          provider_intelligence_field_metadata: {
            provider_observation_feasibility: {
              source_type: "engagement",
              source_label: "Intro debrief",
              evidence_text: "Coordinator said observation is possible on Tuesdays.",
              updated_at: "2026-06-01T12:00:00Z",
            },
          },
        },
      }),
    ).toBe(true);
  });

  it("counts validated profile saves and persisted planning fields as evidence", () => {
    expect(
      providerHasFieldIntelligenceEvidence({
        contact: {
          provider_observation_coordinator_contact: "Maria Lopez maria@hospital.org",
          provider_intelligence_field_metadata: {
            provider_observation_coordinator_contact: {
              source_type: "profile",
              source_label: "Provider overview",
              validated_at: "2026-06-05T12:00:00.000Z",
              lifecycle_state: "validated",
              updated_at: "2026-06-05T12:00:00.000Z",
            },
          },
        },
      }),
    ).toBe(true);

    expect(
      providerHasFieldIntelligenceEvidence({
        contact: { provider_procedure_focus: "Robotics" },
      }),
    ).toBe(true);
  });

  it("counts linked scheduler contacts when planning column is empty", () => {
    expect(
      providerHasFieldIntelligenceEvidence({
        contact: { first_name: "Alex", last_name: "Surgeon" },
        relatedContacts: [
          {
            first_name: "Maria",
            last_name: "Lopez",
            email: "maria@hospital.org",
            role_type: "scheduler",
          },
        ],
      }),
    ).toBe(true);
  });

  it("exports not-started copy constants", () => {
    expect(FIELD_INTELLIGENCE_NOT_STARTED.statusLabel).toBe("Not Started");
    expect(FIELD_INTELLIGENCE_NOT_STARTED.message).toMatch(/No field intelligence/i);
  });
});
