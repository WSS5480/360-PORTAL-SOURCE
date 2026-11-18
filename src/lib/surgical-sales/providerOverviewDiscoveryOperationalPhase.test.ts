import { describe, expect, it } from "vitest";

import {

  PRIMARY_CLINICAL_GAP_LABEL,

  resolveProviderOverviewDiscoveryOperationalPhase,

} from "./providerOverviewDiscoveryOperationalPhase";



describe("providerOverviewDiscoveryOperationalPhase", () => {

  it("keeps new prospects in clinical sponsorship until approval", () => {

    expect(

      resolveProviderOverviewDiscoveryOperationalPhase({

        discovery: {

          phase: "access_mapping",

          advancementSignal: {

            label: "Pending",

            met: false,

            detail: "Need scheduling",

          },

          observationReadiness: [],

          tacticalGap: null,

          nextRecommendedAction: null,

          progressPercent: 10,

          readinessCompleteCount: 0,

          readinessTotal: 0,

        },

        contact: { provider_relationship_stage: "prospect" },

      }),

    ).toBe("clinical_sponsorship");

  });



  it("routes interested-but-not-approved providers into operational access mapping", () => {
    expect(
      resolveProviderOverviewDiscoveryOperationalPhase({
        discovery: {
          phase: "access_mapping",
          advancementSignal: {
            label: "Interest noted",
            met: false,
            detail: null,
          },
          observationReadiness: [],
          tacticalGap: null,
          nextRecommendedAction: null,
          progressPercent: 25,
          readinessCompleteCount: 0,
          readinessTotal: 4,
        },
        contact: {
          provider_observation_feasibility:
            "Observation interest: Yes. Observation approval: No. Access path identified: Partial.",
        },
      }),
    ).toBe("operational_access");
  });

  it("unlocks operational access after observation approval", () => {

    expect(

      resolveProviderOverviewDiscoveryOperationalPhase({

        discovery: {

          phase: "access_mapping",

          advancementSignal: {

            label: "Approved",

            met: true,

            detail: null,

          },

          observationReadiness: [],

          tacticalGap: null,

          nextRecommendedAction: null,

          progressPercent: 80,

          readinessCompleteCount: 0,

          readinessTotal: 3,

        },

        contact: { provider_observation_feasibility: "approved" },

      }),

    ).toBe("operational_access");

  });



  it("defines a single primary focus label for pending approval", () => {

    expect(PRIMARY_CLINICAL_GAP_LABEL).toMatch(/approval pending/i);

  });

});

