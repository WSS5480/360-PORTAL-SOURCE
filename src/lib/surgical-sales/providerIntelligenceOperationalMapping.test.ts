import { describe, expect, it } from "vitest";
import { isCompetitiveIntelligenceFieldVisibleForMaturityStage } from "./providerIntelligenceMaturity";
import {
  OPERATIONAL_MAPPING_STATUS_BADGE,
  buildSectionOperationalMappingProgress,
  intelligenceMappingCtaLabel,
} from "./providerIntelligenceOperationalMapping";

describe("providerIntelligenceOperationalMapping", () => {
  it("uses rep-facing status badges", () => {
    expect(OPERATIONAL_MAPPING_STATUS_BADGE.unknown).toBe("Not started");
    expect(OPERATIONAL_MAPPING_STATUS_BADGE.partial).toBe("Developing");
    expect(OPERATIONAL_MAPPING_STATUS_BADGE.confirmed).toBe("Partial");
    expect(OPERATIONAL_MAPPING_STATUS_BADGE.validated).toBe("Confirmed");
  });

  it("builds simple scan metrics instead of workflow telemetry", () => {
    const progress = buildSectionOperationalMappingProgress("clinical_workflow", {
      provider_procedure_focus: "hernia",
    });
    expect(progress.metricsLine).toMatch(/open items/);
    expect(progress.progressLines[0]).toBe(progress.metricsLine);
    expect(progress.progressLines.some((l) => l.includes("Workflow"))).toBe(false);
  });

  it("hides competitive vendor fields until evaluation stage", () => {
    expect(
      isCompetitiveIntelligenceFieldVisibleForMaturityStage(
        "provider_current_vendors",
        "observation_ready",
      ),
    ).toBe(false);
    expect(
      isCompetitiveIntelligenceFieldVisibleForMaturityStage(
        "provider_current_vendors",
        "evaluation_active",
      ),
    ).toBe(true);
    expect(
      isCompetitiveIntelligenceFieldVisibleForMaturityStage(
        "provider_dissatisfaction_areas",
        "early_discovery",
      ),
    ).toBe(false);
  });

  it("picks contextual mapping CTA from progress", () => {
    expect(
      intelligenceMappingCtaLabel({ mapped: 0, total: 5, unresolvedCount: 5, confidence: "unknown" }),
    ).toBe("Resolve unknowns");
    expect(
      intelligenceMappingCtaLabel({ mapped: 2, total: 5, unresolvedCount: 3, confidence: "partial" }),
    ).toBe("Continue mapping");
    expect(
      intelligenceMappingCtaLabel({ mapped: 5, total: 5, unresolvedCount: 0, confidence: "validated" }),
    ).toBe("Update operational intelligence");
  });
});
