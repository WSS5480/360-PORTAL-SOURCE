import { describe, expect, it } from "vitest";

import {

  buildDiscoveryObservationPermissionMilestones,

  OBSERVATION_PERMISSION_STAGE_LABELS,

  resolveNormalizedObservationPermission,

  resolveObservationPermissionStage,

} from "./observationPermissionModel";

import { emptyProviderCommercialIntelligence, PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY } from "./providerCommercialIntelligenceModel";



describe("observationPermissionModel", () => {

  it("uses the normalized permission model for discovery", () => {

    const milestones = buildDiscoveryObservationPermissionMilestones({ contact: {} });

    expect(milestones.some((m) => m.id === "unknown" && m.state === "current")).toBe(true);

  });



  it("advances to permission_not_yet_confirmed after intro with interest", () => {

    const commercial = emptyProviderCommercialIntelligence();

    commercial.observation.interest = "yes";

    commercial.observation.approval_status = "not_approved";



    const stage = resolveObservationPermissionStage({

      contact: {

        provider_commercial_intelligence: JSON.stringify(commercial),

      },

      engagements: [

        {

          id: "e1",

          engagement_type: "intro_call",

          status: "completed",

        } as never,

      ],

    });



    expect(stage).toBe("permission_not_yet_confirmed");

    expect(resolveNormalizedObservationPermission({

      contact: {

        provider_commercial_intelligence: JSON.stringify(commercial),

      },

      engagements: [

        {

          id: "e1",

          engagement_type: "intro_call",

          status: "completed",

        } as never,

      ],

    }).label).toBe(OBSERVATION_PERMISSION_STAGE_LABELS.permission_not_yet_confirmed);

  });



  it("requires only permission confirmation to reach permission_confirmed", () => {

    const commercial = emptyProviderCommercialIntelligence();

    commercial.observation.approval_status = "approved";

    commercial.observation.access_status = "approved";



    const stage = resolveObservationPermissionStage({

      contact: {

        provider_commercial_intelligence: JSON.stringify(commercial),

        provider_observation_feasibility: "approved",

        provider_intelligence_field_metadata: {

          provider_observation_feasibility: {

            source_type: "profile",

            source_label: "Manual",

            updated_at: "2026-05-01T00:00:00.000Z",

            validated_at: "2026-05-01T00:00:00.000Z",

          },

        },

      },

    });



    expect(stage).toBe("permission_confirmed");

  });



  it("maps explicit decline to not_interested", () => {

    expect(

      resolveObservationPermissionStage({

        contact: { provider_observation_feasibility: "no" },

      }),

    ).toBe("not_interested");

  });



  it("honors manual profile interested save even after intro with interest", () => {

    const stage = resolveObservationPermissionStage({

      contact: {

        provider_observation_feasibility: "interested",

        provider_intelligence_field_metadata: {

          provider_observation_feasibility: {

            source_type: "profile",

            source_label: "Observation approval",

            updated_at: "2026-06-05T00:00:00.000Z",

          },

        },

      },

      engagements: [

        {

          id: "e1",

          engagement_type: "intro_call",

          status: "completed",

        } as never,

      ],

    });



    expect(stage).toBe("interested");

  });



  it("prefers commercial observation interest over empty manual profile unknown", () => {

    const commercial = emptyProviderCommercialIntelligence();

    commercial.observation.interest = "yes";

    const stage = resolveObservationPermissionStage({

      contact: {

        [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: commercial,

        provider_intelligence_field_metadata: {

          provider_observation_feasibility: {

            source_type: "profile",

            source_label: "Observation approval",

            updated_at: "2026-06-01T00:00:00.000Z",

          },

        },

      },

    });



    expect(stage).toBe("interested");

  });

});


