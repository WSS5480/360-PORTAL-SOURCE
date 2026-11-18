import { describe, expect, it } from "vitest";
import {
  compareDiscoveryMappingIntelligenceConfidenceForValidation,
  discoveryMappingIntelligenceConfidenceDisplay,
  resolveDiscoveryMappingIntelligenceConfidence,
  textSuggestsInferredIntelligence,
} from "./discoveryMappingIntelligenceConfidence";

describe("discoveryMappingIntelligenceConfidence", () => {
  it("labels clear single mentions as medium confidence", () => {
    expect(
      resolveDiscoveryMappingIntelligenceConfidence({
        validationStatus: "needs_validation",
        summary: "Karen schedules observations.",
        meta: {
          source_type: "intro_call",
          source_label: "Intro Call",
          updated_at: new Date().toISOString(),
        },
      }),
    ).toBe("medium");
  });

  it("labels inferred language as low confidence", () => {
    expect(
      resolveDiscoveryMappingIntelligenceConfidence({
        validationStatus: "needs_validation",
        summary: "Karen might be involved in scheduling.",
      }),
    ).toBe("low");
    expect(textSuggestsInferredIntelligence("Karen might be involved in scheduling.")).toBe(true);
  });

  it("labels validated on-file findings as high confidence", () => {
    expect(
      resolveDiscoveryMappingIntelligenceConfidence({
        validationStatus: "confirmed",
        summary: "Karen schedules observations.",
        resolved: true,
        meta: {
          source_type: "profile",
          source_label: "Manual mapping",
          updated_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
          lifecycle_state: "validated",
        },
      }),
    ).toBe("high");
  });

  it("prioritizes low confidence ahead of medium for validation sorting", () => {
    expect(
      compareDiscoveryMappingIntelligenceConfidenceForValidation("low", "medium"),
    ).toBeLessThan(0);
    expect(
      compareDiscoveryMappingIntelligenceConfidenceForValidation("medium", "high"),
    ).toBeLessThan(0);
  });

  it("formats display label for UI", () => {
    expect(discoveryMappingIntelligenceConfidenceDisplay("medium")).toBe("Confidence: Medium");
  });
});
