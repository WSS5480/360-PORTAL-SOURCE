import { describe, expect, it } from "vitest";

import {

  accountUnderstandingOperationalState,

  accountUnderstandingAreaForSection,

  PROVIDER_ACCOUNT_UNDERSTANDING,

  ACCOUNT_UNDERSTANDING_AREAS,

  ACCOUNT_UNDERSTANDING_CARD,

} from "./providerAccountUnderstanding";



describe("providerAccountUnderstanding", () => {

  it("uses operational intelligence vocabulary", () => {

    expect(PROVIDER_ACCOUNT_UNDERSTANDING.pageLead).toMatch(/operational picture/i);

    expect(PROVIDER_ACCOUNT_UNDERSTANDING.intelligenceByArea).toBe("Mission readiness by area");

    expect(PROVIDER_ACCOUNT_UNDERSTANDING.pageAria).toBe("Operational intelligence workspace");

    expect(ACCOUNT_UNDERSTANDING_AREAS.operational.title).toBe("OR access & workflow");

    expect(ACCOUNT_UNDERSTANDING_AREAS.commercial.title).toBe("Evaluation & vendors");

    expect(ACCOUNT_UNDERSTANDING_CARD.captureIntelligence).toBe("Continue mapping");

  });



  it("returns lane-specific rep states", () => {

    expect(accountUnderstandingOperationalState("operational", "unknown")).toBe(
      "OR access and scheduling still developing",
    );

    expect(accountUnderstandingOperationalState("workflow", "partial")).toBe(
      "Case workflow partially mapped",
    );

    expect(accountUnderstandingOperationalState("relationship", "confirmed")).toBe(
      "Relationship supports field planning",
    );

  });



  it("uses plain blocker copy when questions remain open", () => {

    expect(

      accountUnderstandingOperationalState("field_readiness", "validated", {

        hasOpenLoops: true,

      }),

    ).toBe("Observation path not deployment-ready");

    expect(

      accountUnderstandingOperationalState("operational", "confirmed", {

        hasOpenLoops: true,

      }),

    ).toBe("OR access path still unclear");

  });



  it("maps intelligence sections to understanding areas", () => {

    expect(accountUnderstandingAreaForSection("or_environment")).toBe("operational");

    expect(accountUnderstandingAreaForSection("observation_readiness")).toBe("field_readiness");

  });

});


