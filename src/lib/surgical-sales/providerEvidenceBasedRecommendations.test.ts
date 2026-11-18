import { describe, expect, it } from "vitest";
import {
  buildProviderEvidenceBasedRecommendations,
  evidenceBasedRecommendationLabels,
  providerHasEvidenceForRecommendations,
} from "./providerEvidenceBasedRecommendations";

describe("providerEvidenceBasedRecommendations", () => {
  it("does not recommend from blank profile", () => {
    const recs = buildProviderEvidenceBasedRecommendations({ contact: {} });
    expect(recs).toHaveLength(0);
    expect(evidenceBasedRecommendationLabels({ contact: {} })).toHaveLength(0);
    expect(providerHasEvidenceForRecommendations({})).toBe(false);
  });

  it("chains interest evidence to seek observation approval", () => {
    const recs = buildProviderEvidenceBasedRecommendations({
      contact: { provider_observation_feasibility: "Provider open to vendor observation" },
      stageId: "discovery",
    });
    const seek = recs.find((r) => r.id === "seek_observation_approval");
    expect(seek?.evidence).toBe("Provider interested in observation");
    expect(seek?.conclusion).toBe("Access pathway exists");
    expect(seek?.recommendation).toBe("Seek observation approval");
  });

  it("chains credentialing evidence to confirm credentialing process after permission confirmed", () => {
    const recs = buildProviderEvidenceBasedRecommendations({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
        provider_observation_credentialing_needed: "Credentialing required before vendor can observe",
      },
      stageId: "discovery",
    });
    const cred = recs.find((r) => r.id === "confirm_credentialing_process");
    expect(cred?.evidence).toBe("Credentialing required");
    expect(cred?.conclusion).toBe("Facility access has dependency");
    expect(cred?.recommendation).toBe("Confirm credentialing process");
  });

  it("chains scheduler reference to confirm scheduling contact", () => {
    const recs = buildProviderEvidenceBasedRecommendations({
      contact: {
        provider_observation_feasibility: "yes",
        provider_observation_coordinator_contact: "Work through Emily — contact info not captured",
      },
      stageId: "observe",
    });
    expect(recs.some((r) => r.recommendation === "Scheduling contact needs confirmation")).toBe(true);
  });

  it("chains approval evidence to schedule observation", () => {
    const recs = buildProviderEvidenceBasedRecommendations({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            lifecycle_state: "validated",
            validated_at: "2026-06-01T00:00:00.000Z",
          },
        },
      },
      stageId: "observe",
    });
    const sched = recs.find((r) => r.id === "schedule_observation");
    expect(sched?.recommendation).toBe("Schedule observation");
  });
});
