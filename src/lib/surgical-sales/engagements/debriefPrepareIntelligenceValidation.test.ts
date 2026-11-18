import { describe, expect, it } from "vitest";
import {
  buildValidatedMeetingObjective,
  isMalformedObservationConcept,
  planningContentContainsBannedPattern,
  validateRepFacingProductName,
  validateRepFacingQuestion,
  validateRepFacingFact,
  validateRepFacingWedgeTopic,
} from "./debriefPrepareIntelligenceValidation";
import { debriefCopyContainsBannedPattern } from "./debriefRepFacingCopy";

describe("debriefPrepareIntelligenceValidation", () => {
  const johnAppleCtx = { providerName: "John Apple", completedObservationCount: 5 };

  it("rejects ontology product labels and provider-name collisions", () => {
    expect(isMalformedObservationConcept("Apple Product Used Surgery observed", johnAppleCtx)).toBe(
      true,
    );
    expect(isMalformedObservationConcept("product used surgery observed", johnAppleCtx)).toBe(true);
    expect(validateRepFacingProductName("Apple Product Used Surgery", johnAppleCtx)).toBeNull();
    expect(validateRepFacingProductName("Bard Mesh", johnAppleCtx)).toBe("Bard Mesh");
  });

  it("discards malformed wedge topics instead of surfacing ontology labels", () => {
    const topic = validateRepFacingWedgeTopic("Apple Product Used Surgery observed", johnAppleCtx);
    expect(topic).toBeNull();
  });

  it("filters malformed questions", () => {
    const question = validateRepFacingQuestion(
      "Apple Product has been your consistent choice on these cases — is that still true?",
      johnAppleCtx,
    );
    expect(question).toBeNull();
  });

  it("accepts staff and workflow observation facts", () => {
    expect(
      validateRepFacingFact("Staff appeared organized (5 of 5 observations)", {}),
    ).toBeTruthy();
    expect(
      validateRepFacingFact("Staff appeared organized (5 of 5 observations)", johnAppleCtx),
    ).toBeTruthy();
    expect(
      validateRepFacingFact("Workflow delays slowed case progress (1 of 5 observations)", johnAppleCtx),
    ).toBeTruthy();
    expect(
      validateRepFacingFact(
        "Product availability verification caused delays (1 of 5 observations)",
        johnAppleCtx,
      ),
    ).toBeTruthy();
  });

  it("builds meeting objectives from validated workflow observations only", () => {
    const objective = buildValidatedMeetingObjective({
      strongestPatternLabel: "Extra visualization time before fixation (4 of 5 observations)",
      providerName: "John Apple",
      completedObservationCount: 5,
    });
    expect(objective).toMatch(/visualization time before fixation/i);
    expect(objective).not.toMatch(/visualization-before-fixation/i);
    expect(debriefCopyContainsBannedPattern(objective)).toBe(false);
  });

  it("prefers workflow pattern labels over frustration phrasing collisions", () => {
    const objective = buildValidatedMeetingObjective({
      strongestPatternLabel: "Provider frustration during fixation decisions (2 of 5 observations)",
      providerName: "John Apple",
      completedObservationCount: 5,
    });
    expect(objective).toMatch(/frustration during fixation/i);
  });

  it("falls back when objective generation would leak internal labels", () => {
    const objective = buildValidatedMeetingObjective({
      strongestPatternLabel: "workflow observed",
      wedgeTopic: "apple product used surgery observed",
      providerName: "John Apple",
    });
    expect(objective).toMatch(/strongest pattern observed during the observation program/i);
    expect(objective).not.toMatch(/workflow observed|apple product/i);
  });

  it("detects banned patterns in planning payloads", () => {
    expect(
      planningContentContainsBannedPattern({
        meetingObjective: "Determine whether apple product used surgery observed matters.",
        knownFacts: ["5 observations completed"],
        suggestedQuestions: [],
      }),
    ).toBe(true);
  });
});
