import { describe, expect, it } from "vitest";



import {

  evidenceDescribesObservationOfPerson,

  evidenceLooksLikeObservedWithProvider,

  personNameMatchesProvider,

  shouldRejectAssignedProviderContactRole,

} from "./providerContactRolePolicy";



describe("providerContactRolePolicy", () => {

  it("matches provider and surgeon names with or without Dr prefix", () => {

    expect(personNameMatchesProvider("Dr. Onion", "Mark Onion")).toBe(true);

    expect(personNameMatchesProvider("Onion", "Mark Onion")).toBe(true);

    expect(personNameMatchesProvider("Mark Onion", "Dr. Mark Onion")).toBe(true);

    expect(personNameMatchesProvider("Jennifer", "Mark Onion")).toBe(false);

    expect(personNameMatchesProvider("Lettuce Today", "Tom Lettuce")).toBe(true);

  });



  it("detects observation-opening evidence for the provider", () => {

    expect(

      evidenceLooksLikeObservedWithProvider(

        "Today I observed a robotic ventral hernia repair with Dr. Onion.",

        "Mark Onion",

      ),

    ).toBe(true);

    expect(

      evidenceDescribesObservationOfPerson(

        "Observed my fourth case with Dr. Onion today.",

        "Dr. Onion",

      ),

    ).toBe(true);

  });



  it("rejects contact_role facts for the assigned provider", () => {

    expect(

      shouldRejectAssignedProviderContactRole({

        concept: "contact_role",

        normalized_label: "Dr. Onion · Scheduling Coordinator",

        person_mentioned: "Onion",

        evidence_text: "Today I observed a robotic ventral hernia repair with Dr. Onion.",

        providerName: "Mark Onion",

      }),

    ).toBe(true);



    expect(

      shouldRejectAssignedProviderContactRole({

        concept: "contact_role",

        normalized_label: "Jennifer · Scheduling Coordinator",

        person_mentioned: "Jennifer",

        evidence_text: "Jennifer handles most of the scheduling and coordination for cases",

        providerName: "Mark Onion",

      }),

    ).toBe(false);

  });



  it("rejects surgeon-as-scheduler without provider context when evidence is observation phrasing", () => {

    expect(

      shouldRejectAssignedProviderContactRole({

        concept: "contact_role",

        normalized_label: "Dr. Onion · Scheduling Coordinator",

        evidence_text: "Observed my fourth case with Dr. Onion today.",

      }),

    ).toBe(true);



    expect(

      shouldRejectAssignedProviderContactRole({

        concept: "contact_role",

        normalized_label: "Jennifer · Scheduling Coordinator",

        evidence_text: "Jennifer handles most of the scheduling and coordination for cases",

      }),

    ).toBe(false);

  });

});


