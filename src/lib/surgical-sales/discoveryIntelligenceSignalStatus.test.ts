import { describe, expect, it } from "vitest";
import {
  DISCOVERY_FIELD_STATUS,
  DISCOVERY_SIGNAL_STATUS,
  discoverySignalPriority,
  discoverySignalPriorityLabel,
  discoverySignalPriorityTier,
  isDiscoverySignalStatusResolved,
  resolveDiscoveryStructuredSignalStatus,
  resolveDiscoverySignalCaptureConfidence,
  resolveObservationApprovalStatus,
  resolveSchedulingOwnerStatus,
} from "./discoveryIntelligenceSignalStatus";

const F = DISCOVERY_FIELD_STATUS;

describe("discoveryIntelligenceSignalStatus", () => {
  it("maps observation approval to shared lifecycle statuses", () => {
    expect(resolveObservationApprovalStatus({})).toBe(F.unknown);
    expect(
      resolveObservationApprovalStatus({
        provider_evaluation_openness: "open",
      }),
    ).toBe(F.captured);
    expect(
      resolveObservationApprovalStatus({
        provider_observation_feasibility: "easy",
      }),
    ).toBe(F.captured);
    expect(
      resolveObservationApprovalStatus({
        provider_observation_feasibility: "credentialing_required",
        provider_observation_credentialing_needed: "required",
      }),
    ).toBe(F.conditional);
    expect(
      resolveObservationApprovalStatus({
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
      }),
    ).toBe(F.validated);
    expect(
      resolveObservationApprovalStatus({
        provider_observation_feasibility: "no",
      }),
    ).toBe(F.blocked);
  });

  it("maps scheduling owner to Captured vs Validated", () => {
    expect(resolveSchedulingOwnerStatus({})).toBe(F.unknown);
    expect(
      resolveSchedulingOwnerStatus({
        provider_observation_coordinator_contact: "Jane — OR desk",
      }),
    ).toBe(F.captured);
  });

  it("keeps detail nuance separate from status", () => {
    expect(
      resolveDiscoverySignalCaptureConfidence({
        signalId: "observation_approval",
        statusLabel: F.captured,
        dbKeys: ["provider_evaluation_openness"],
        primaryDbKey: "provider_evaluation_openness",
        contact: { provider_evaluation_openness: "open" },
        fieldMeta: {},
      }),
    ).toBe(
      "Observation interest captured — approval still open · Awaiting validation on file",
    );

    expect(
      resolveDiscoverySignalCaptureConfidence({
        signalId: "workflow_visibility",
        statusLabel: F.captured,
        dbKeys: ["provider_procedure_focus"],
        primaryDbKey: "provider_procedure_focus",
        contact: { provider_procedure_focus: "Lap colorectal" },
        fieldMeta: {},
      }),
    ).toBe("Partial understanding · Awaiting validation on file");
  });

  it("uses uncertainty-first detail labels", () => {
    expect(
      resolveDiscoverySignalCaptureConfidence({
        dbKeys: ["provider_procedure_focus"],
        primaryDbKey: "provider_procedure_focus",
        contact: {},
        fieldMeta: {},
      }),
    ).toBe("Nothing documented in the field yet");

    expect(
      resolveDiscoverySignalCaptureConfidence({
        signalId: "scheduling_owner",
        statusLabel: F.captured,
        dbKeys: ["provider_observation_coordinator_contact"],
        primaryDbKey: "provider_observation_coordinator_contact",
        contact: { provider_observation_coordinator_contact: "Jane" },
        fieldMeta: {},
      }),
    ).toBe("Jane · Awaiting validation on file");
  });

  it("resolves all structured signal ids with shared statuses", () => {
    const contact = {
      provider_observation_feasibility: "restricted",
      provider_observation_coordinator_contact: "Scheduler",
      provider_procedure_focus: "robotic",
      provider_case_volume_estimate: "high",
      provider_champion_potential: "medium",
      influence_level: "high",
    };
    expect(resolveDiscoveryStructuredSignalStatus("observation_approval", contact)).toBe(
      F.captured,
    );
    expect(resolveDiscoveryStructuredSignalStatus("workflow_visibility", contact)).toBe(
      F.captured,
    );
    expect(resolveDiscoveryStructuredSignalStatus("case_opportunity", contact)).toBe(F.captured);
    expect(resolveDiscoveryStructuredSignalStatus("clinical_champion", contact)).toBe(
      F.captured,
    );
    expect(isDiscoverySignalStatusResolved("observation_approval", F.captured)).toBe(false);
    expect(isDiscoverySignalStatusResolved("observation_approval", F.validated)).toBe(true);
  });

  it("assigns gate, important, and strategic priority tiers", () => {
    expect(discoverySignalPriority("observation_approval")).toBe(1);
    expect(discoverySignalPriority("observation_logistics")).toBe(2);
    expect(discoverySignalPriority("case_opportunity")).toBe(3);
    expect(discoverySignalPriorityTier(1)).toBe("gate");
    expect(discoverySignalPriorityTier(2)).toBe("important");
    expect(discoverySignalPriorityTier(3)).toBe("strategic");
    expect(discoverySignalPriorityLabel(1)).toBe("Gate");
  });

  it("keeps legacy DISCOVERY_SIGNAL_STATUS aliases aligned", () => {
    expect(DISCOVERY_SIGNAL_STATUS.observationApproval.interested).toBe(F.captured);
    expect(DISCOVERY_SIGNAL_STATUS.schedulingOwner.confirmed).toBe(F.validated);
    expect(DISCOVERY_SIGNAL_STATUS.workflowVisibility.partial).toBe(F.captured);
  });
});
