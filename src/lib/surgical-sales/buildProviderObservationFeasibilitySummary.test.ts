import { describe, expect, it } from "vitest";
import { buildProviderObservationFeasibilitySummary } from "./buildProviderObservationFeasibilitySummary";
import { resolveProviderCommercialWorkflowStage } from "./providerCommercialWorkflowStage";

describe("buildProviderObservationFeasibilitySummary", () => {
  it("returns likely feasible when core scheduling signals are captured", () => {
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "observation_scheduled",
      opportunities: [],
      cases: [],
      engagements: [],
    });

    const summary = buildProviderObservationFeasibilitySummary({
      commercialStage,
      contact: {
        provider_observation_feasibility: "easy",
        provider_observation_credentialing_needed: "cleared",
        provider_observation_coordinator_contact: "Jane OR scheduler",
        provider_observation_access_path: "none|coordinator",
        provider_ideal_observation_cases: "hernia",
        provider_observation_cadence_preference: "weekly",
        provider_observation_best_days_case_types: "tuesday|high_volume",
      },
    });

    expect(summary.verdictId).toBe("likely_feasible");
    expect(summary.verdictLabel).toBe("OR entry: Clear");
    expect(summary.safeToSchedule.answer).toBe("yes");
    expect(summary.validatedRequirements.length).toBeGreaterThan(3);
    expect(summary.operationalInterpretation.length).toBeGreaterThan(20);
    expect(summary.inputs.find((r) => r.id === "observation_allowed")?.status).toBe("clear");
    expect(summary.inputs.find((r) => r.id === "coordinator_identified")?.value).toBeTruthy();
    expect(summary.blockingUnknowns).toHaveLength(0);
    expect(summary.nextValidations).toHaveLength(0);
    expect(summary.beforeBookingConfirm.length).toBeGreaterThan(0);
    expect(summary.validationItems.length).toBeLessThan(3);
  });

  it("flags blockers when observation is restricted with OR gates", () => {
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "observation_requested",
      opportunities: [],
      cases: [],
      engagements: [],
    });

    const summary = buildProviderObservationFeasibilitySummary({
      commercialStage,
      contact: {
        provider_observation_feasibility: "restricted",
        provider_observation_access_path: "committee|credentialing",
      },
    });

    expect(summary.verdictId).toBe("blockers_identified");
    expect(summary.validationItems.length).toBeGreaterThan(0);
  });

  it("returns too early with thin intelligence", () => {
    const summary = buildProviderObservationFeasibilitySummary({
      commercialStage: "early_discovery",
      contact: { provider_relationship_stage: "prospect" },
    });

    expect(summary.verdictId).toBe("too_early");
    expect(summary.inputs.filter((r) => r.status === "unknown").length).toBeGreaterThan(3);
    expect(summary.validationItems.length).toBeGreaterThan(2);
  });

  it("hides panel when observation section not visible for stage", () => {
    const summary = buildProviderObservationFeasibilitySummary({
      commercialStage: "evaluation",
      contact: {},
    });

    expect(summary.showPanel).toBe(false);
  });

  it("treats unmapped credentialing as a blocker after observation approval", () => {
    const summary = buildProviderObservationFeasibilitySummary({
      commercialStage: "early_discovery",
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
      },
    });

    const credentialing = summary.inputs.find((r) => r.id === "credentialing_status");
    expect(credentialing?.status).toBe("restrictive");
    expect(credentialing?.value).toContain("not yet mapped");
    expect(summary.verdictId).toBe("blockers_identified");
  });
});
