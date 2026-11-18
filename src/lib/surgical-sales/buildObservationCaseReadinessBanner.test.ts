import { describe, expect, it } from "vitest";

import { buildObservationCaseReadinessBanner } from "./buildObservationCaseReadinessBanner";



describe("buildObservationCaseReadinessBanner", () => {

  it("returns ready when all observation gates are complete", () => {

    const view = buildObservationCaseReadinessBanner({

      caseRow: {

        status: "scheduled",

        case_date: "2026-06-04",

        surgeon_contact_id: "provider-1",

        observation_access_pathway: "Vendor badge via materials",

        observation_access_scheduling_owner: "Maria — OR desk",

        observation_access_credentialing: "verified",

      },

    });



    expect(view.readyToObserve).toBe(true);

    expect(view.headline).toBe("READY FOR OBSERVATION");

    expect(view.statusLabel).toBe("READY FOR OBSERVATION");

    expect(view.pendingChecks).toHaveLength(0);

    expect(view.checks.map((check) => check.label)).toEqual(

      expect.arrayContaining(["Observation approved", "Provider confirmed", "Case scheduled"]),

    );

  });



  it("stays ready when only optional access reference items are open", () => {

    const view = buildObservationCaseReadinessBanner({

      caseRow: {

        status: "scheduled",

        case_date: "2026-06-04",

        surgeon_contact_id: "provider-1",

        observation_access_scheduling_owner: "Maria",

        observation_access_credentialing: "verified",

      },

    });



    expect(view.readyToObserve).toBe(true);

    expect(view.headline).toBe("READY FOR OBSERVATION");

    expect(view.pendingChecks).toHaveLength(0);

    expect(view.accessSummaryChecks.some((check) => /approval pending/i.test(check.label))).toBe(true);

  });



  it("returns action required when provider is missing", () => {

    const view = buildObservationCaseReadinessBanner({

      caseRow: {

        status: "scheduled",

        case_date: "2026-06-04",

      },

    });



    expect(view.readyToObserve).toBe(false);

    expect(view.headline).toBe("PREP IN PROGRESS");

    expect(view.pendingChecks.some((check) => check.id === "provider_confirmed")).toBe(true);

  });



  it("treats validated provider observation approval as complete", () => {

    const view = buildObservationCaseReadinessBanner({

      caseRow: {

        status: "scheduled",

        case_date: "2026-06-04",

        surgeon_contact_id: "provider-1",

        observation_access_scheduling_owner: "Maria",

        observation_access_credentialing: "not_required",

      },

      providerContact: {

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



    expect(view.readyToObserve).toBe(true);

    expect(view.checks.find((check) => check.id === "observation_approval")?.state).toBe("complete");

  });

});

