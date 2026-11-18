import { describe, expect, it } from "vitest";

import {

  accountUnderstandingConfidenceFromSection,

  accountUnderstandingOperationalRisk,

  accountUnderstandingTacticalImplication,

} from "./accountUnderstandingOperationalCard";

import { learningGapForField } from "./providerIntelligenceLearningGaps";



describe("accountUnderstandingOperationalCard", () => {

  it("maps section confidence to mission readiness levels", () => {
    const contact = {
      provider_procedure_focus: "hernia,general_mis",
      provider_technique_preferences: "laparoscopic",
    };
    expect(
      accountUnderstandingConfidenceFromSection("clinical_workflow", contact, null, {
        sectionConfidence: "confirmed",
      }).level,
    ).toBe("confirmed");
    expect(
      accountUnderstandingConfidenceFromSection("clinical_workflow", contact, null, {
        sectionConfidence: "partial",
      }).level,
    ).toBe("partial");
    expect(
      accountUnderstandingConfidenceFromSection("or_environment", contact, null, {
        sectionConfidence: "unknown",
      }).level,
    ).toBe("not_explored");
  });



  it("builds operational risk and tactical lines from gaps", () => {

    const gap = learningGapForField(
      "provider_observation_access_path",
      "or_environment",
      { provider_observation_access_path: "" },
    );

    expect(accountUnderstandingOperationalRisk(gap, "operational").length).toBeGreaterThan(12);

    expect(accountUnderstandingTacticalImplication(gap, "operational")).toMatch(/enables/i);

  });

});


