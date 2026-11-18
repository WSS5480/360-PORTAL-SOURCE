import { describe, expect, it } from "vitest";

import { parseLogUpdateFreeform } from "./logUpdateParseFreeform";



const EXAMPLE =

  "OR access goes through vendor credentialing and the scheduler approves observation requests.";



const ctx = {

  providerId: "00000000-0000-4000-8000-000000000001",

  providerLabel: "Dr. Example",

  organizationId: "00000000-0000-4000-8000-000000000004",

  organizationLabel: "Memorial",

};



describe("parseLogUpdateFreeform", () => {

  it("parses OR access example into human-readable suggestions and related review", () => {

    const result = parseLogUpdateFreeform(EXAMPLE, ctx, {});



    expect(result.usesProviderIntelligence).toBe(true);

    const labels = result.fieldUpdates.map((u) => u.label);

    expect(labels).toContain("OR access — barriers and openness");

    expect(labels).toContain("Who approves observations");

    expect(labels).toContain("Vendor credentialing on file");



    expect(result.fieldUpdates.every((u) => u.accepted)).toBe(true);

    expect(result.saveAsNoteAccepted).toBe(true);



    expect(result.intelligenceReview.partiallyConfirmed.length).toBeGreaterThan(0);

    expect(result.stillMissing).not.toContain("Vendor credentialing status confirmed");

    expect(result.stillMissing).not.toContain("Scheduling owner / coordinator named");

    expect(result.intelligenceReview.stillWorthConfirming).toEqual(result.stillMissing);

  });



  it("drops gaps when the note already covers them", () => {

    const result = parseLogUpdateFreeform(

      "Credentialing turnaround is about 3 weeks and we are credentialed. Best OR days are Tuesday AM. Observation cadence is monthly. Coordinator Maria handles scheduling.",

      ctx,

      { provider_credentialing_status: "Credentialed", provider_observation_coordinator_contact: "Maria" },

    );

    expect(result.stillMissing).not.toContain("Credentialing turnaround time");

    expect(result.stillMissing).not.toContain("Best days or case posting window");

    expect(result.stillMissing).not.toContain("Observation cadence");

    expect(result.stillMissing).not.toContain("Scheduling owner / coordinator named");

  });

});

