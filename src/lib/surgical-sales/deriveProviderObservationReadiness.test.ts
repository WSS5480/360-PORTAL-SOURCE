import { describe, expect, it } from "vitest";
import {
  calculateObservationReadinessFromCommercialIntelligence,
  deriveCredentialingState,
} from "@/lib/surgical-sales/deriveProviderObservationReadiness";
import { emptyProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

describe("calculateObservationReadinessFromCommercialIntelligence", () => {
  it("returns Not Ready when provider interest is unknown", () => {
    const intel = emptyProviderCommercialIntelligence();
    intel.observation.interest = "unknown";

    const result = calculateObservationReadinessFromCommercialIntelligence(intel);
    expect(result.readiness).toBe("not_ready");
    expect(result.displayLabel).toBe("Build relationship first");
    expect(result.blockers).toContain("provider_interest_unknown");
  });

  it("returns Ready when approved even if optional execution intel is missing", () => {
    const intel = emptyProviderCommercialIntelligence();
    intel.observation.interest = "yes";
    intel.observation.approval_status = "approved";
    intel.observation.credentialing_required = "yes";
    intel.credentialing.credentialing_required = "yes";
    intel.credentialing.credentialing_platform_known = "no";
    intel.scheduling.scheduler_identified = "partial";
    intel.scheduling.scheduler_contact_linked = "no";

    const result = calculateObservationReadinessFromCommercialIntelligence(intel);
    expect(result.readiness).toBe("ready");
    expect(result.displayLabel).toBe("Ready to plan");
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(deriveCredentialingState(intel)).toBe("required_platform_unknown");
  });

  it("returns Ready when approved and credentialing is complete", () => {
    const intel = emptyProviderCommercialIntelligence();
    intel.observation.interest = "yes";
    intel.observation.approval_status = "approved";
    intel.credentialing.credentialing_required = "no";
    intel.observation.credentialing_required = "no";

    const result = calculateObservationReadinessFromCommercialIntelligence(intel);
    expect(result.readiness).toBe("ready");
    expect(result.displayLabel).toBe("Ready to plan");
  });

  it("returns Ready when approved and credentialing notes indicate completion", () => {
    const intel = emptyProviderCommercialIntelligence();
    intel.observation.interest = "yes";
    intel.observation.approval_status = "approved";
    intel.credentialing.credentialing_required = "yes";
    intel.credentialing.credentialing_notes = ["Vendor credentialing is complete"];

    const result = calculateObservationReadinessFromCommercialIntelligence(intel);
    expect(result.readiness).toBe("ready");
    expect(deriveCredentialingState(intel)).toBe("complete");
  });

  it("returns Conditional when interested but not yet approved", () => {
    const intel = emptyProviderCommercialIntelligence();
    intel.observation.interest = "yes";
    intel.observation.approval_status = "interested";

    const result = calculateObservationReadinessFromCommercialIntelligence(intel);
    expect(result.readiness).toBe("conditional");
    expect(result.displayLabel).toBe("Plan with open questions");
  });
});
