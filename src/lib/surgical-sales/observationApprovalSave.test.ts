import { describe, expect, it } from "vitest";
import {
  buildObservationApprovalCommercialIntelligencePatch,
  buildObservationApprovalSavePayload,
  normalizeObservationApprovalStatus,
  observationApprovalGrantsPathwayAdvance,
} from "./observationApprovalSave";
import { readProviderCommercialIntelligence } from "./providerCommercialIntelligenceModel";
import {
  observationStatusGrantsPathwayAdvance,
  observationStatusLabel,
  resolveObservationStatusFromContact,
} from "./observationStatus";

describe("observationStatus", () => {
  it("resolves unknown, permission requested, confirmed, and denied from contact", () => {
    expect(resolveObservationStatusFromContact({})).toBe("unknown");
    expect(
      resolveObservationStatusFromContact({
        provider_observation_feasibility: "discussed",
      }),
    ).toBe("permission_not_yet_confirmed");
    expect(
      resolveObservationStatusFromContact({
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
    ).toBe("permission_confirmed");
    expect(
      resolveObservationStatusFromContact({
        provider_observation_feasibility: "denied",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
      }),
    ).toBe("not_interested");
  });

  it("only advances pathway on permission confirmed", () => {
    expect(observationStatusGrantsPathwayAdvance("permission_confirmed")).toBe(true);
    expect(observationStatusGrantsPathwayAdvance("permission_not_yet_confirmed")).toBe(false);
    expect(observationStatusGrantsPathwayAdvance("denied")).toBe(false);
    expect(observationStatusGrantsPathwayAdvance("unknown")).toBe(false);
  });

  it("labels rep-facing status values", () => {
    expect(observationStatusLabel("permission_not_yet_confirmed")).toBe("Permission Requested");
  });
});

describe("normalizeObservationApprovalStatus", () => {
  it("accepts modal status values from the overview page", () => {
    expect(normalizeObservationApprovalStatus("permission_confirmed")).toBe("permission_confirmed");
    expect(normalizeObservationApprovalStatus("permission_not_yet_confirmed")).toBe(
      "permission_not_yet_confirmed",
    );
    expect(normalizeObservationApprovalStatus("interested")).toBe("interested");
    expect(normalizeObservationApprovalStatus("not_interested")).toBe("denied");
  });

  it("maps legacy engagement outcome aliases to canonical permission stages", () => {
    expect(normalizeObservationApprovalStatus("approved")).toBe("permission_confirmed");
    expect(normalizeObservationApprovalStatus("discussed")).toBe("permission_not_yet_confirmed");
  });
});

describe("buildObservationApprovalSavePayload", () => {
  it("persists provider observation feasibility for legacy approved alias", () => {
    const normalized = normalizeObservationApprovalStatus("approved");
    const payload = buildObservationApprovalSavePayload({
      status: normalized ?? "permission_confirmed",
      approvalNote: "Observation Approved",
    });
    expect(payload.planning.provider_observation_feasibility).toBe("approved");
    expect(payload.intelligence_validate_fields).toContain("provider_observation_feasibility");
  });
  it("validates approved status for pathway advance", () => {
    const payload = buildObservationApprovalSavePayload({
      status: "permission_confirmed",
      approvedBy: "Dr. Chen",
      approvalNote: "OK for vendor observation",
    });
    expect(payload.planning.provider_observation_feasibility).toBe("approved");
    expect(payload.intelligence_validate_fields).toContain("provider_observation_feasibility");
    expect(payload.intelligence_field_evidence.provider_observation_feasibility).toMatch(/Dr\. Chen/);
    expect(observationApprovalGrantsPathwayAdvance("permission_confirmed")).toBe(true);
  });

  it("records permission requested without validating on file", () => {
    const payload = buildObservationApprovalSavePayload({ status: "permission_not_yet_confirmed" });
    expect(payload.planning.provider_observation_feasibility).toBe("discussed");
    expect(payload.intelligence_validate_fields).toHaveLength(0);
    expect(observationApprovalGrantsPathwayAdvance("permission_not_yet_confirmed")).toBe(false);
  });

  it("records denied without opening observation stage", () => {
    const payload = buildObservationApprovalSavePayload({ status: "denied" });
    expect(payload.planning.provider_observation_feasibility).toBe("denied");
    expect(observationApprovalGrantsPathwayAdvance("denied")).toBe(false);
  });

  it("clears approval when status is unknown", () => {
    const payload = buildObservationApprovalSavePayload({ status: "unknown" });
    expect(payload.planning.provider_observation_feasibility).toBeNull();
    expect(payload.intelligence_validate_fields).toHaveLength(0);
  });

  it("syncs structured commercial intelligence on manual save", () => {
    const patch = buildObservationApprovalCommercialIntelligencePatch({}, "permission_confirmed");
    const intel = readProviderCommercialIntelligence(patch);
    expect(intel?.observation.approval_status).toBe("approved");
    expect(intel?.observation.interest).toBe("yes");

    const interestedPatch = buildObservationApprovalCommercialIntelligencePatch(
      {},
      "interested",
    );
    expect(readProviderCommercialIntelligence(interestedPatch)?.observation.approval_status).toBe(
      "interested",
    );
  });
});
