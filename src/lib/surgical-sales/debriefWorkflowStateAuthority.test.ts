import { describe, expect, it } from "vitest";

import {
  deriveConfirmedWorkflowStates,
  workflowFieldUpdateRestatesConfirmedState,
} from "@/lib/surgical-sales/debriefWorkflowStateAuthority";

describe("deriveConfirmedWorkflowStates", () => {
  it("treats the rep's engagement outcome as the highest authority", () => {
    const confirmed = deriveConfirmedWorkflowStates({
      engagementOutcomeId: "observation_approved",
      providerContact: null,
    });
    expect(confirmed.observationApproved).toBe(true);
    expect(confirmed.observationDenied).toBe(false);
  });

  it("confirms denial from the observation_denied outcome", () => {
    const confirmed = deriveConfirmedWorkflowStates({
      engagementOutcomeId: "observation_denied",
      providerContact: null,
    });
    expect(confirmed.observationApproved).toBe(false);
    expect(confirmed.observationDenied).toBe(true);
  });

  it("confirms approval from a validated provider field (structured workflow layer)", () => {
    const confirmed = deriveConfirmedWorkflowStates({
      providerContact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: JSON.stringify({
          provider_observation_feasibility: { validated_at: "2026-06-01T00:00:00Z" },
        }),
      },
    });
    expect(confirmed.observationApproved).toBe(true);
  });

  it("does not confirm from an unvalidated (default-filled) provider field", () => {
    const confirmed = deriveConfirmedWorkflowStates({
      providerContact: { provider_observation_feasibility: "approved" },
    });
    expect(confirmed.observationApproved).toBe(false);
  });

  it("confirms credentialing and scheduling owner from validated fields", () => {
    const confirmed = deriveConfirmedWorkflowStates({
      providerContact: {
        provider_credentialing_status: "RepTrax credentialing required",
        provider_scheduling_contact: "Jennifer (office scheduling)",
        provider_intelligence_field_metadata: {
          provider_credentialing_status: { lifecycle_state: "validated" },
          provider_scheduling_contact: { validated_at: "2026-06-01T00:00:00Z" },
        },
      },
    });
    expect(confirmed.credentialingKnown).toBe(true);
    expect(confirmed.schedulingOwnerOnFile).toContain("Jennifer");
  });

  it("returns nothing confirmed without outcome or validated fields", () => {
    const confirmed = deriveConfirmedWorkflowStates({ providerContact: {} });
    expect(confirmed).toEqual({
      observationApproved: false,
      observationDenied: false,
      credentialingKnown: false,
      schedulingOwnerOnFile: null,
    });
  });
});

describe("workflowFieldUpdateRestatesConfirmedState", () => {
  it("suppresses an AI update that restates the on-file observation approval", () => {
    expect(
      workflowFieldUpdateRestatesConfirmedState({
        dbKey: "provider_observation_feasibility",
        existingValue: "approved",
        proposedValue: "Approved",
      }),
    ).toBe(true);
  });

  it("keeps contradicting workflow updates so the conflict flow decides", () => {
    expect(
      workflowFieldUpdateRestatesConfirmedState({
        dbKey: "provider_observation_feasibility",
        existingValue: "approved",
        proposedValue: "denied",
      }),
    ).toBe(false);
  });

  it("does not touch non-workflow intelligence fields", () => {
    expect(
      workflowFieldUpdateRestatesConfirmedState({
        dbKey: "provider_clinical_focus_trends",
        existingValue: "Robotic hernia volume increasing",
        proposedValue: "Robotic hernia volume increasing",
      }),
    ).toBe(false);
  });

  it("ignores empty existing values (state not yet on file)", () => {
    expect(
      workflowFieldUpdateRestatesConfirmedState({
        dbKey: "provider_observation_feasibility",
        existingValue: "",
        proposedValue: "approved",
      }),
    ).toBe(false);
  });
});
