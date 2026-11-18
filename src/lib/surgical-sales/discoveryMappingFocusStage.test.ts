import { describe, expect, it } from "vitest";
import { DISCOVERY_FIELD_STATUS } from "./discoveryIntelligenceSignalStatus";
import {
  applyDiscoveryMappingFocusStageBucket,
  discoveryMappingCategoryOrderForFocusStage,
  resolveDiscoveryMappingFocusStage,
} from "./discoveryMappingFocusStage";
import { resolveStageMappingVisibilityBucket } from "./stageMappingQuestionRegistry";
import { buildPathwayIntelligenceForStage } from "./pathwayStageIntelligence";

describe("discoveryMappingFocusStage", () => {
  const prospectGaps = [
    ...buildPathwayIntelligenceForStage("discovery", { contact: {} }),
    ...buildPathwayIntelligenceForStage("observe", { contact: {} }),
  ];

  const validatedMeta = {
    source_type: "profile",
    source_label: "Manual mapping",
    updated_at: "2026-01-01T00:00:00.000Z",
    validated_at: "2026-01-01T00:00:00.000Z",
    lifecycle_state: "validated",
  };

  it("resolves access pathway for early discovery prospects", () => {
    expect(
      resolveDiscoveryMappingFocusStage({
        contact: { provider_relationship_stage: "prospect" },
      }),
    ).toBe("access_pathway");
  });

  it("stays on access pathway when only approval is validated", () => {
    const contact = {
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: validatedMeta,
      },
    };
    expect(resolveDiscoveryMappingFocusStage({ contact })).toBe("access_pathway");
  });

  it("resolves observation intelligence when access workflow is complete", () => {
    const contact = {
      provider_observation_feasibility: "approved",
      provider_observation_coordinator_contact: "Maria",
      provider_observation_access_path: "none",
      provider_observation_credentialing_needed: "cleared",
      provider_credentialing_status: "cleared",
      provider_observation_best_days_case_types: "Tue AM lap cases",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: validatedMeta,
        provider_observation_access_path: validatedMeta,
        provider_observation_credentialing_needed: validatedMeta,
        provider_credentialing_status: validatedMeta,
        provider_observation_best_days_case_types: validatedMeta,
        provider_observation_coordinator_contact: validatedMeta,
      },
    };
    expect(resolveDiscoveryMappingFocusStage({ contact })).toBe("observation_intelligence");
  });

  it("resolves opportunity development when a case observation is done", () => {
    expect(
      resolveDiscoveryMappingFocusStage({
        contact: {},
        cases: [{ case_type: "observation", status: "completed", id: "case-1" }],
      }),
    ).toBe("opportunity_development");
  });

  it("demotes observation intelligence during access pathway stage", () => {
    const base = resolveStageMappingVisibilityBucket({
      signalId: "opportunity_clinical_frustrations",
      pathwayStageId: "discovery",
      maturity: "unknown",
      statusLabel: DISCOVERY_FIELD_STATUS.unknown,
      dbKeys: ["provider_clinical_frustrations"],
      fieldMeta: {},
      pathwayGaps: prospectGaps,
    });

    expect(base).toBe("helpful_next");
    expect(
      applyDiscoveryMappingFocusStageBucket({
        focusStage: "access_pathway",
        signalId: "opportunity_clinical_frustrations",
        baseBucket: base,
      }),
    ).toBe("later_stage");
  });

  it("never marks observation intelligence as required before observation", () => {
    expect(
      applyDiscoveryMappingFocusStageBucket({
        focusStage: "observation_intelligence",
        signalId: "opportunity_clinical_frustrations",
        baseBucket: "required_now",
      }),
    ).toBe("helpful_next");
  });

  it("promotes opportunity development signals after observation completion", () => {
    expect(
      applyDiscoveryMappingFocusStageBucket({
        focusStage: "opportunity_development",
        signalId: "product_alignment",
        baseBucket: "later_stage",
      }),
    ).toBe("helpful_next");
    expect(
      applyDiscoveryMappingFocusStageBucket({
        focusStage: "opportunity_development",
        signalId: "case_opportunity",
        baseBucket: "helpful_next",
      }),
    ).toBe("required_now");
  });

  it("orders access pathway intelligence first during stage 1", () => {
    expect(discoveryMappingCategoryOrderForFocusStage("access_pathway")).toEqual([
      "operational",
      "opportunity",
      "sales",
    ]);
  });

  it("orders opportunity development intelligence first after observation", () => {
    expect(discoveryMappingCategoryOrderForFocusStage("opportunity_development")).toEqual([
      "sales",
      "opportunity",
      "operational",
    ]);
  });
});
