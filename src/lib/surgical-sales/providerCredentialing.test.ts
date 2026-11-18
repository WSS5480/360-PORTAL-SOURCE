import { describe, expect, it } from "vitest";
import {
  buildProviderCredentialingDiscoveredIntelLines,
  buildProviderCredentialingPlanningPatch,
  contactWithCredentialingMappingMetadata,
  drawerStatusFromWorkflowToken,
  formatRenewalNotesWithTargetDate,
  providerCredentialingFromContact,
  providerCredentialingFromMappingMetadata,
  workflowTokenFromDrawerStatus,
  workflowTokenFromPathwayChoice,
} from "./providerCredentialing";

describe("providerCredentialing", () => {
  it("reads structured credentialing from contact", () => {
    const model = providerCredentialingFromContact({
      provider_credentialing_platform_name: "RepTrax",
      provider_credentialing_contact: "Pat (Credentialing)",
      provider_observation_credentialing_needed: "in_progress",
      provider_intelligence_field_metadata: {
        provider_credentialing_platform_name: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: "2026-05-20T12:00:00.000Z",
        },
      },
    });
    expect(model.structured.platformName).toBe("RepTrax");
    expect(model.workflowStatus).toBe("in_progress");
    expect(model.discoveredSourceLabel).toBe("Intro Call debrief");
  });

  it("maps drawer status and pathway choice to workflow tokens", () => {
    expect(workflowTokenFromDrawerStatus("cleared")).toBe("cleared");
    expect(workflowTokenFromPathwayChoice("required_pending")).toBe("in_progress");
    expect(drawerStatusFromWorkflowToken("submitted")).toBe("submitted");
  });

  it("builds planning patch with platform and workflow token", () => {
    const patch = buildProviderCredentialingPlanningPatch({
      structured: {
        platformId: "p1",
        platformName: "VendorClear",
        credentialingContact: "Karen",
        approvalContact: "",
        renewalNotes: "Annual renewal",
        requiredDocuments: "",
        facilityInstructions: "",
      },
      workflowToken: "in_progress",
    });
    expect(patch.provider_credentialing_platform_name).toBe("VendorClear");
    expect(patch.provider_observation_credentialing_needed).toBe("in_progress");
    expect(patch.provider_credentialing_status).toBe("in_progress");
  });

  it("does not infer not required from a completed credentialing workflow", () => {
    const model = providerCredentialingFromContact({
      provider_observation_credentialing_needed: "cleared",
      provider_credentialing_status: "cleared",
    });
    const lines = buildProviderCredentialingDiscoveredIntelLines(model);

    expect(model.workflowStatus).toBe("completed");
    expect(model.requirementStatus).toBe("unknown");
    expect(model.approvalRequired).toBeNull();
    expect(lines.join("\n")).not.toMatch(/not required/i);
  });

  it("persists complete status as workflow tokens for green readiness checks", () => {
    const patch = buildProviderCredentialingPlanningPatch({
      structured: {
        platformId: "",
        platformName: "",
        credentialingContact: "",
        approvalContact: "",
        renewalNotes: "",
        requiredDocuments: "",
        facilityInstructions: "",
      },
      workflowToken: "cleared",
      statusSummary: "Credentialing complete",
    });

    expect(patch.provider_observation_credentialing_needed).toBe("cleared");
    expect(patch.provider_credentialing_status).toBe("cleared");
  });

  it("merges mapping metadata onto contact for drawer preview", () => {
    const merged = contactWithCredentialingMappingMetadata(
      { provider_credentialing_platform_name: "" },
      {
        platform_name: "Symplr",
        credentialing_contact: "Admin desk",
      },
    );
    expect(merged.provider_credentialing_platform_name).toBe("Symplr");
    expect(merged.provider_credentialing_contact).toBe("Admin desk");
  });

  it("formats discovered intel lines for drawer", () => {
    const model = providerCredentialingFromMappingMetadata(
      {
        platform_name: "RepTrax",
        credentialing_contact: "Karen",
        approval_required: "yes",
        intelligence_notes: "Vendor desk on 2nd floor",
      },
      "required_pending",
    );
    const lines = buildProviderCredentialingDiscoveredIntelLines(model);
    expect(lines.some((l) => /RepTrax/i.test(l))).toBe(true);
    expect(lines.some((l) => /Karen/i.test(l))).toBe(true);
  });

  it("round-trips target date in renewal notes", () => {
    const withDate = formatRenewalNotesWithTargetDate("Renew annually", "2026-09-15");
    const model = providerCredentialingFromContact({
      provider_credentialing_renewal_notes: withDate,
    });
    expect(model.targetDate).toBe("2026-09-15");
    expect(model.structured.renewalNotes).toBe("Renew annually");
  });
});
