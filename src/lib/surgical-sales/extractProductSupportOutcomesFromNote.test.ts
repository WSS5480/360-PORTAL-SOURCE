import { describe, expect, it } from "vitest";
import { buildProductSupportClassificationFieldPatch } from "./buildProductSupportNoteFieldPatches";
import { extractProductSupportObservation } from "./extractProductSupportObservation";
import { extractProductSupportOutcomesFromNote } from "./extractProductSupportOutcomesFromNote";

const DR_ONION_NOTE = `Stopped by Dr. Onion's case today to provide product support. Overall things went smoothly, but there was a brief delay at the beginning of the case while the team confirmed they had the correct mesh size available.

Dr. Onion didn't have any major complaints, but he did mention that visualization can still be challenging in some of the larger abdominal wall cases. During the procedure he spent a little extra time getting the exposure where he wanted it before moving forward.

The scrub tech asked a couple questions about product sizing and available options, so there may be an opportunity for some additional staff education. Other than that, the team seemed comfortable with the workflow and there were no major issues during the case.

Worth following up on inventory planning and continuing to watch whether visualization comes up in future cases.`;

describe("extractProductSupportOutcomesFromNote", () => {
  it("extracts positive successful outcomes from dictation", () => {
    const outcomes = extractProductSupportOutcomesFromNote(
      "Case went well. Surgeon was pleased with the tray setup.",
    );
    expect(outcomes.providerReaction).toBe("positive");
    expect(outcomes.caseResult).toBe("successful");
  });

  it("extracts issue and follow-up language", () => {
    const outcomes = extractProductSupportOutcomesFromNote(
      "Tray was missing a component. Need to follow up with SPD next week.",
    );
    expect(outcomes.caseResult).toBe("issue_encountered");
    expect(outcomes.nextStep).toBe("follow_up_meeting");
  });

  it("extracts evaluation and training next steps", () => {
    expect(extractProductSupportOutcomesFromNote("Surgeon wants a trial next month.").nextStep).toBe("evaluation");
    expect(extractProductSupportOutcomesFromNote("Staff requested in-service training.").nextStep).toBe("training");
  });

  it("does not mark minor friction as issue when the case went smoothly overall", () => {
    const outcomes = extractProductSupportOutcomesFromNote(DR_ONION_NOTE);
    expect(outcomes.providerReaction).toBe("positive");
    expect(outcomes.caseResult).toBe("successful");
    expect(outcomes.nextStep).toBe("training");
  });
});

describe("buildProductSupportClassificationFieldPatch", () => {
  it("maps provider feedback into surgeon reactions field", () => {
    const extraction = extractProductSupportObservation("Surgeon said the tray setup was intuitive.");
    const patch = buildProductSupportClassificationFieldPatch(extraction, {});
    expect(patch.live_observation_surgeon_reactions).toContain("Surgeon said the tray setup was intuitive.");
  });

  it("maps product signals into product fit field", () => {
    const extraction = extractProductSupportObservation("Opened ACSIS tray and deployed the implant.");
    const patch = buildProductSupportClassificationFieldPatch(extraction, {});
    expect(patch.live_observation_product_fit).toBeTruthy();
  });
});
