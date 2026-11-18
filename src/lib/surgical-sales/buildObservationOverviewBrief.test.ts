import { describe, expect, it } from "vitest";

import {

  buildObservationOverviewBrief,

  observationCaseHasProductInterest,

} from "./buildObservationOverviewBrief";



describe("buildObservationOverviewBrief", () => {

  it("prioritizes mission from case observation goal", () => {

    const brief = buildObservationOverviewBrief({

      caseRow: {

        observation_goal: "Observe robotic hernia workflow and validate ACSIS fit.",

      },

    });

    expect(brief.mission).toBe("Observe robotic hernia workflow and validate ACSIS fit.");

  });



  it("surfaces observation objectives from case planning fields", () => {

    const brief = buildObservationOverviewBrief({

      caseRow: {

        observation_goal: "Understand fixation workflow\nAssess product fit",

        observation_signals_to_validate: "Surgeon openness to change",

      },

    });

    expect(brief.objectives).toContain("Understand fixation workflow");

    expect(brief.objectives).toContain("Assess product fit");

    expect(brief.objectives).toContain("Surgeon openness to change");

    expect(brief.objectives.length).toBeLessThanOrEqual(5);

  });



  it("surfaces learning needs from key questions and engagement probes", () => {

    const brief = buildObservationOverviewBrief({

      caseRow: {

        observation_key_questions: "What products are currently used?\nWhat workarounds are being used?",

      },

      engagement: {

        pre_observation_probes: "What outcomes matter most to the provider?",

      },

    });

    expect(brief.learningNeeds).toContain("What products are currently used?");

    expect(brief.learningNeeds).toContain("What workarounds are being used?");

    expect(brief.learningNeeds).toContain("What outcomes matter most to the provider?");

    expect(brief.learningNeeds.length).toBeLessThanOrEqual(5);

  });



  it("does not surface access-planning questions as learning needs", () => {

    const brief = buildObservationOverviewBrief({

      caseRow: {

        observation_access_scheduling_owner: "",

        observation_access_pathway: "",

        observation_access_credentialing: "unknown",

        case_date: "2026-05-29",

        status: "scheduled",

        live_observation_questions: "Which tray vendor is on the field?",

      },

    });

    expect(brief.learningNeeds).not.toContain("Who owns scheduling?");

    expect(brief.learningNeeds).not.toContain("Credentialing requirements?");

    expect(brief.learningNeeds).not.toContain("Observation date confirmed?");

    expect(brief.learningNeeds.some((q) => q.includes("tray vendor"))).toBe(false);

  });



  it("does not surface access confirmations as objectives", () => {

    const brief = buildObservationOverviewBrief({

      caseRow: {

        observation_access_pathway: "Vendor escort",

        observation_access_scheduling_owner: "Karen",

        observation_access_credentialing: "verified",

      },

      providerContact: {

        provider_observation_access_path: "approved|Observation approved",

      },

    });

    expect(brief.objectives.some((item) => /scheduling|credentialing|access pathway/i.test(item))).toBe(false);

  });

});



describe("observationCaseHasProductInterest", () => {

  it("detects quick finding product interest", () => {

    expect(

      observationCaseHasProductInterest({

        observation_quick_finding_product_interest: "Strong",

      }),

    ).toBe(true);

  });

});

