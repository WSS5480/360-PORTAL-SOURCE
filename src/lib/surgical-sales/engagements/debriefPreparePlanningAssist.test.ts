import { describe, expect, it } from "vitest";
import {
  buildCommercialSignalDraft,
  buildHypothesisDraft,
  buildInitialConfirmObjectives,
  buildInitialSuggestedQuestions,
} from "./debriefPreparePlanningAssist";
import { meetingObjectiveContainsLeakedInternalCopy } from "./debriefPrepareIntelligenceValidation";

describe("debriefPreparePlanningAssist", () => {
  const basePatterns = [
    { label: "Extra visualization time before fixation", count: 4, total: 5, importance: 140 },
    { label: "Provider frustration during fixation decisions", count: 2, total: 5, importance: 140 },
    { label: "Staff appeared organized", count: 5, total: 5, importance: -50 },
  ];

  const baseDraft = {
    meetingObjective: "Confirm whether the extra visualization time before fixation matters enough to act on.",
    knownFacts: [
      "Extra visualization time before fixation (4 of 5 observations)",
      "Provider frustration during fixation decisions (2 of 5 observations)",
      "Staff appeared organized (5 of 5 observations)",
    ],
    whyItMatters: "",
    suggestedLearnItems: [],
    suggestedQuestions: [],
    providerName: "John Apple",
    procedureLabel: "Robotic ventral hernia",
    strongestObservedPattern: "Extra visualization time before fixation",
  };

  const baseContext = {
    draft: baseDraft,
    patterns: basePatterns,
    providerName: "John Apple",
    procedureLabel: "Robotic ventral hernia",
  };

  it("builds a concise commercial hypothesis paragraph", () => {
    const hypothesis = buildHypothesisDraft(baseContext);

    expect(hypothesis).toMatch(/Visualization challenges may occur/i);
    expect(hypothesis).toMatch(/Dr\. Apple/i);
    expect(hypothesis).toMatch(/meaningful issue/i);
    expect(hypothesis).not.toMatch(/workflow friction/i);
    expect(hypothesis.length).toBeLessThan(420);
  });

  it("builds a two-sentence commercial signal", () => {
    const signal = buildCommercialSignalDraft(baseContext);

    expect(signal).toMatch(/visualization time/i);
    expect(signal).toMatch(/validating during the debrief/i);
    expect(signal.split(".").filter(Boolean).length).toBeLessThanOrEqual(2);
  });

  it("provides rep-facing validation goals and conversational questions", () => {
    const goals = buildInitialConfirmObjectives({ providerName: "John Apple" });
    const questions = buildInitialSuggestedQuestions({ providerName: "John Apple" });

    expect(goals.length).toBeGreaterThanOrEqual(4);
    expect(goals.some((goal) => /surgeon's perspective/i.test(goal))).toBe(true);
    expect(questions.length).toBeGreaterThanOrEqual(4);
    expect(questions.some((q) => /minor annoyance|real cases/i.test(q))).toBe(true);
    expect(questions.join(" ")).not.toMatch(/visualization-before-fixation/i);
  });

  it("blocks leaked internal copy in objectives", () => {
    expect(meetingObjectiveContainsLeakedInternalCopy("workflow observed")).toBe(true);
    expect(meetingObjectiveContainsLeakedInternalCopy("apple product used surgery observed")).toBe(true);
    expect(
      meetingObjectiveContainsLeakedInternalCopy(
        "Confirm whether the extra visualization time before fixation matters enough to act on.",
      ),
    ).toBe(false);
  });
});
