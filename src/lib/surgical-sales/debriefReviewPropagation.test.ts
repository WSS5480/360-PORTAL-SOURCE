import { describe, expect, it } from "vitest";

import {

  buildDebriefReviewPropagationTargets,

  businessOutcomeLabelForItem,

  collectUniqueBusinessOutcomesFromTargets,

  commercialImpactForDbKey,

  repFriendlyUpdateLabelForDbKey,

} from "@/lib/surgical-sales/debriefReviewPropagation";



const scope = {

  engagementId: "eng-1",

  providerId: "prov-1",

  organizationId: "org-1",

  providerLabel: "Dr. Smith",

  organizationLabel: "Metro Hospital",

  engagementTypeLabel: "Intro Call",

  engagementType: "intro_call",

  productFocus: null,

  locked: true,

};



describe("debriefReviewPropagation", () => {

  it("maps observation access fields to provider profile intelligence outcome", () => {

    expect(repFriendlyUpdateLabelForDbKey("provider_observation_access_path")).toBe(

      "Provider profile intelligence",

    );

    expect(commercialImpactForDbKey("provider_observation_access_path").itemId).toBe(

      "observation_access",

    );

  });



  it("maps clinical fields to clinical opportunity mapping outcome", () => {

    expect(repFriendlyUpdateLabelForDbKey("provider_clinical_frustrations")).toBe(

      "Clinical opportunity mapping",

    );

    expect(repFriendlyUpdateLabelForDbKey("provider_procedure_focus")).toBe(

      "Clinical opportunity mapping",

    );

  });



  it("returns deduped business outcomes for accepted updates", () => {

    const targets = buildDebriefReviewPropagationTargets({

      scope,

      logUpdate: {

        sourceText: "x",

        suggestedUpdates: [],

        fieldUpdates: [

          {

            id: "c1",

            label: "Scheduling contact",

            dbKey: "provider_scheduling_contact",

            proposedValue: "Karen",

            accepted: true,

            conflict: null,

          },

          {

            id: "c2",

            label: "Credentialing",

            dbKey: "provider_credentialing_status",

            proposedValue: "Required",

            accepted: true,

            conflict: null,

          },

        ],

        stillMissing: [],

        intelligenceReview: {

          confirmedUpdates: [],

          partiallyConfirmed: [],

          stillWorthConfirming: [],

          relatedOperationalAreas: [],

        },

        saveAsNoteAccepted: false,

        usesProviderIntelligence: true,

      },

      engagementNotesSaved: false,

    });



    expect(collectUniqueBusinessOutcomesFromTargets(targets)).toEqual(["Observation readiness"]);

    expect(targets.every((t) => t.label === "Observation readiness")).toBe(true);

    expect(targets.some((t) => /operational understanding|deployment readiness|clinical focus/i.test(t.label))).toBe(

      false,

    );

  });



  it("labels follow-up propagation as future engagement planning", () => {

    expect(businessOutcomeLabelForItem("recommended_next_engagement")).toBe(

      "Future engagement planning",

    );

  });

});
