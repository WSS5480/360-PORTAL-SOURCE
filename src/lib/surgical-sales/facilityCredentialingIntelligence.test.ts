import { describe, expect, it } from "vitest";
import {
  buildCredentialingPathwayOverviewState,
  buildFacilityCredentialingPlanningPatch,
  formatFacilityCredentialingSummaryLine,
} from "./facilityCredentialingIntelligence";
import { normalizeCredentialingPlatformName } from "./credentialingPlatforms";

describe("facilityCredentialingIntelligence", () => {
  it("normalizes platform names case-insensitively", () => {
    expect(normalizeCredentialingPlatformName(" RepTrax ")).toBe("reptrax");
    expect(normalizeCredentialingPlatformName("Green   Security")).toBe("green security");
  });

  it("shows muted overview line before approval", () => {
    const state = buildCredentialingPathwayOverviewState({
      provider_observation_feasibility: "interested",
    });
    expect(state.line).toContain("not yet mapped");
    expect(state.tone).toBe("muted");
    expect(state.promoteToBlocker).toBe(false);
  });

  it("promotes credentialing to blocker after approval when unmapped", () => {
    const state = buildCredentialingPathwayOverviewState({
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Manual",
          updated_at: "2026-05-01T00:00:00.000Z",
          validated_at: "2026-05-01T00:00:00.000Z",
        },
      },
    });
    expect(state.promoteToBlocker).toBe(true);
    expect(state.tone).toBe("warn");
  });

  it("builds structured planning patch and summary line", () => {
    const patch = buildFacilityCredentialingPlanningPatch({
      platformId: "p1",
      platformName: "RepTrax",
      credentialingContact: "Pat (Credentialing)",
      approvalContact: "OR Admin",
      renewalNotes: "Renews annually in March",
      requiredDocuments: "TB test, HIPAA",
      facilityInstructions: "Check in at vendor desk",
    });
    expect(patch.provider_credentialing_platform_name).toBe("RepTrax");
    expect(patch.provider_credentialing_contact).toBe("Pat (Credentialing)");

    const summary = formatFacilityCredentialingSummaryLine({
      platformId: "p1",
      platformName: "RepTrax",
      credentialingContact: "Pat (Credentialing)",
      approvalContact: "",
      renewalNotes: "",
      requiredDocuments: "",
      facilityInstructions: "",
    });
    expect(summary).toContain("Platform: RepTrax");
    expect(summary).toContain("Credentialing: Pat (Credentialing)");
  });
});
