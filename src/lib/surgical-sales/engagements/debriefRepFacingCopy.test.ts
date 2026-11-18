import { describe, expect, it } from "vitest";
import {
  debriefCopyContainsBannedPattern,
  humanizeDebriefTopic,
  sanitizeDebriefRepFacingCopy,
  sanitizeDebriefStrategy,
} from "./debriefRepFacingCopy";

describe("debriefRepFacingCopy", () => {
  it("strips known provider profile builder prefixes", () => {
    const topic = humanizeDebriefTopic(
      "Known workflow pain point on provider profile: Visualization before fixation creates uncertainty",
    );
    expect(topic).toMatch(/visualization/i);
    expect(topic).not.toMatch(/provider profile/i);
  });

  it("replaces Still needed and Validate in field intelligence leakage", () => {
    const sanitized = sanitizeDebriefRepFacingCopy(
      "Still needed: Validate in field intelligence. Workflow fit was rated possible from field notes.",
    );
    expect(sanitized).not.toMatch(/still needed/i);
    expect(sanitized).not.toMatch(/field intelligence/i);
    expect(debriefCopyContainsBannedPattern(sanitized)).toBe(false);
  });

  it("humanizes ontology product labels", () => {
    const topic = humanizeDebriefTopic("Apple Product Used Surgery observed");
    expect(topic.toLowerCase()).not.toMatch(/apple product used surgery/i);
    expect(topic.length).toBeGreaterThan(0);
  });

  it("sanitizes full strategy output", () => {
    const sanitized = sanitizeDebriefStrategy({
      missionWhy: "Known workflow pain point on provider profile: visualization delays.",
      missionSuccess: "Leave with 360 Experience, Case Commitment, or No Action.",
      openingQuestion: "Where should we start on a commercial next step?",
      decisionQuestions: ["Still needed: Validate in field intelligence?"],
      opportunityQuestions: ["Field signals suggest possible fit for Endolumik."],
      closingQuestions: ["What would need to be true before you'd commit to evaluation cases?"],
      mustAnswerBeforeLeaving: ["Which path did you agree on?"],
      advancementPaths: [
        {
          id: "360_experience",
          label: "360 Experience",
          status: "recommended",
          coachingNote: "Interest is building — propose 360 Experience first.",
        },
        {
          id: "case_commitment",
          label: "Case Commitment",
          status: "consider",
          coachingNote: "Use when ready for OR evaluation cases.",
        },
        {
          id: "no_action",
          label: "No Action",
          status: "hold",
          coachingNote: "Maintain relationship without forcing a step.",
        },
      ],
      desiredOutcome: "Walk out with one agreed path.",
    });

    const blob = JSON.stringify(sanitized);
    expect(debriefCopyContainsBannedPattern(blob)).toBe(false);
    expect(sanitized.decisionQuestions[0]).not.toMatch(/still needed/i);
  });
});
