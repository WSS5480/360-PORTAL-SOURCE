import { describe, expect, it } from "vitest";
import {
  buildDiscoveryLearnedFeedback,
  buildSectionSynthesizedScanSummary,
  synthesizeOperationalInsight,
} from "@/lib/surgical-sales/discoveryOperationalSynthesis";
import { buildSectionOperationalMappingProgress } from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";

describe("discoveryOperationalSynthesis", () => {
  it("synthesizes observation access without CRM dump labels", () => {
    const line = synthesizeOperationalInsight("provider_observation_feasibility", "easy");
    expect(line).toContain("scheduling coordination");
    expect(line?.toLowerCase()).not.toContain("vendor observation allowed");
  });

  it("synthesizes robotic modality as workflow preference", () => {
    const line = synthesizeOperationalInsight("provider_technique_preferences", "robotic");
    expect(line).toContain("robotic workflow");
  });

  it("buildDiscoveryLearnedFeedback prefixes operational area", () => {
    expect(buildDiscoveryLearnedFeedback("provider_technique_preferences", "robotic")).toBe(
      "Procedure mix partially confirmed",
    );
  });

  it("scan summary uses synthesis when contact has signals", () => {
    const contact = {
      provider_observation_feasibility: "easy",
      provider_observation_coordinator_contact: "Jane — scheduler",
    };
    const progress = buildSectionOperationalMappingProgress("observation_readiness", contact);
    const summary = buildSectionSynthesizedScanSummary({
      sectionId: "observation_readiness",
      contact,
      progress,
      topGap: null,
      preferDbKey: "provider_observation_feasibility",
    });
    expect(summary).toContain("scheduling coordination");
  });
});
