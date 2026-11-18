import { describe, expect, it } from "vitest";

import { assessProviderHardDeleteFromProfile } from "./providerLifecyclePolicy";
import { PATHWAY_VALIDATED_FIELD_META } from "./salesPathwayTestFixtures";

describe("providerLifecyclePolicy", () => {
  it("allows hard delete for a bare new provider", () => {
    const assessment = assessProviderHardDeleteFromProfile({
      contact: { first_name: "Jamie", last_name: "Lee" },
    });
    expect(assessment.hardDeleteAllowed).toBe(true);
    expect(assessment.blockHardDeleteReason).toBeNull();
  });

  it("blocks hard delete when engagements exist", () => {
    const assessment = assessProviderHardDeleteFromProfile({
      contact: {},
      engagements: [{ id: "e1" } as never],
    });
    expect(assessment.hardDeleteAllowed).toBe(false);
    expect(assessment.hasEngagements).toBe(true);
  });

  it("blocks hard delete when cases exist", () => {
    const assessment = assessProviderHardDeleteFromProfile({
      contact: {},
      cases: [{ id: "c1", case_type: "observation" }],
    });
    expect(assessment.hardDeleteAllowed).toBe(false);
    expect(assessment.hasCases).toBe(true);
  });

  it("blocks hard delete when notes or intelligence exist", () => {
    expect(
      assessProviderHardDeleteFromProfile({
        contact: { notes: "Met at conference" },
      }).hardDeleteAllowed,
    ).toBe(false);

    expect(
      assessProviderHardDeleteFromProfile({
        contact: {},
        activityTimeline: [{ body: "Logged intro call", kind: "provider_activity" }],
      }).hardDeleteAllowed,
    ).toBe(false);

    expect(
      assessProviderHardDeleteFromProfile({
        contact: {
          provider_observation_coordinator_contact: "Karen",
          provider_intelligence_field_metadata: {
            provider_observation_coordinator_contact: PATHWAY_VALIDATED_FIELD_META,
          },
        },
      }).hardDeleteAllowed,
    ).toBe(false);
  });
});
