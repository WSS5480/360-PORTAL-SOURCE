import { describe, expect, it } from "vitest";
import {
  DISCOVERY_MAPPING_DISPLAY_LABELS,
  formatDiscoveryMappingIntelligenceDisplaySummary,
  formatDiscoveryMappingSourceDisplay,
  stripDiscoveryMappingStatusPrefix,
} from "./discoveryMappingDisplayFormat";
import { DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY } from "./discoveryMappingEvidenceQuality";

describe("discoveryMappingDisplayFormat", () => {
  it("formats open cards with the empty-state copy", () => {
    expect(
      formatDiscoveryMappingIntelligenceDisplaySummary({
        scanSlug: "open",
        interpretation: null,
      }),
    ).toBe(DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY);
  });

  it("prefixes populated cards by scan status", () => {
    expect(
      formatDiscoveryMappingIntelligenceDisplaySummary({
        scanSlug: "potential_lead",
        interpretation: "Karen may coordinate scheduling.",
      }),
    ).toBe("Potential signal found: Karen may coordinate scheduling.");

    expect(
      formatDiscoveryMappingIntelligenceDisplaySummary({
        scanSlug: "partial",
        interpretation: "Complex abdominal wall reconstruction volume appears to be increasing.",
      }),
    ).toBe(
      "Partial understanding: Complex abdominal wall reconstruction volume appears to be increasing.",
    );

    expect(
      formatDiscoveryMappingIntelligenceDisplaySummary({
        scanSlug: "confirmed",
        interpretation: "Observation access approved.",
      }),
    ).toBe("Confirmed: Observation access approved.");
  });

  it("does not treat the card question as intelligence", () => {
    const question = "Where is observation scheduling controlled?";
    expect(
      formatDiscoveryMappingIntelligenceDisplaySummary({
        scanSlug: "partial",
        interpretation: question,
        questionText: question,
      }),
    ).toBe(DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY);
  });

  it("strips duplicate status prefixes before formatting", () => {
    expect(stripDiscoveryMappingStatusPrefix("Partial understanding: Karen handles scheduling.")).toBe(
      "Karen handles scheduling.",
    );
  });

  it("normalizes source reviewed lines to Source:", () => {
    expect(formatDiscoveryMappingSourceDisplay("Source reviewed: Intro Call debrief")).toBe(
      "Source: Intro Call debrief",
    );
    expect(formatDiscoveryMappingSourceDisplay("Source: Field capture")).toBe(
      "Source: Field capture",
    );
  });

  it("uses the requested display labels", () => {
    expect(DISCOVERY_MAPPING_DISPLAY_LABELS.stillNeed).toBe("Still Need");
    expect(DISCOVERY_MAPPING_DISPLAY_LABELS.suggestedNextAction).toBe("Suggested Next Action");
  });
});
