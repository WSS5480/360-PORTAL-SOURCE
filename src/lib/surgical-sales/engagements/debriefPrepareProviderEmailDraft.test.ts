import { describe, expect, it } from "vitest";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import {
  buildDebriefPrepareEmailDraftUserPrompt,
  parseDebriefPrepareEmailDraftResponse,
  SIM360_EXPERIENCE_URL,
} from "./debriefPrepareProviderEmailDraft";

describe("debriefPrepareProviderEmailDraft", () => {
  it("parses structured SUBJECT/BODY response", () => {
    const parsed = parseDebriefPrepareEmailDraftResponse(
      "SUBJECT: SIM360 visit for ACSIS\n---\nBODY:\nHi Dr. Onion,\n\nLooking forward to connecting.",
    );

    expect(parsed.subject).toBe("SIM360 visit for ACSIS");
    expect(parsed.body).toContain("Hi Dr. Onion");
  });

  it("builds a prompt with observation notes, facts, and SIM360 goal", () => {
    const prompt = buildDebriefPrepareEmailDraftUserPrompt({
      outreachGoal: "sim360_experience",
      targetProduct: getDebriefProductKnowledge("ACSIS"),
      providerName: "Mark Onion",
      organizationName: "Pilot Hospital",
      completedObservationCount: 5,
      meetingObjective: "Confirm visualization friction",
      whyItMatters: "Fixation decisions slow when visibility is poor",
      hypothesis: "ACSIS may reduce visualization time",
      knownFacts: ["Extra visualization time before fixation (4 of 5 observations)"],
      learnItems: ["Whether frustration is routine or case-specific"],
      questionCards: ["How do you decide when visualization is good enough?"],
      meetingNotes: "Bring wedge samples",
      observationNotes: ["Case was smooth but extra time before mesh fixation."],
      observationCorpus: [
        {
          caseId: "case-1",
          caseDate: "2026-06-01",
          observationIndex: 1,
          body: "Observed extra visualization before fixation.",
          sourceNoteId: "note-1",
          createdAt: "2026-06-01T12:00:00Z",
        },
      ],
      universalFactsReadModel: null,
    });

    expect(prompt).toMatch(/Mark Onion/);
    expect(prompt).toMatch(/Extra visualization time before fixation/);
    expect(prompt).toMatch(/Observed extra visualization before fixation/);
    expect(prompt).toMatch(SIM360_EXPERIENCE_URL);
    expect(prompt).toMatch(/sim360_experience|SIM360/i);
  });
});
