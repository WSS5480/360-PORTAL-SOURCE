import { describe, expect, it } from "vitest";
import { buildDebriefGuidanceIntelligence } from "./buildDebriefGuidanceIntelligence";
import { buildDebriefExecutionGuideFromWorkspace } from "./buildDebriefExecutionGuideFromWorkspace";
import type { DebriefPrioritizedPattern } from "./debriefIntelligencePrioritization";
import {
  buildDebriefPrepareWorkspaceView,
  type DebriefPrepareWorkspaceDraft,
} from "./debriefPrepareWorkspace";

function pattern(label: string, count: number, total = 5): DebriefPrioritizedPattern {
  return { label, count, total, importance: 0 };
}

const MIXED_PATTERNS = [
  pattern("Incumbent mesh used consistently", 5),
  pattern("Extra visualization time before fixation", 2),
  pattern("Staff appeared comfortable with current process", 5),
];

function buildDraft(overrides: Partial<DebriefPrepareWorkspaceDraft> = {}): DebriefPrepareWorkspaceDraft {
  const intelligence = buildDebriefGuidanceIntelligence({
    patterns: MIXED_PATTERNS,
    unresolvedObservationPrompts: ["Listen for provider frustration during the case"],
    providerName: "Alex Surgeon",
    procedureLabel: "Complex abdominal repair",
  });

  return {
    meetingObjective: "Validate visualization time with Dr. Surgeon.",
    knownFacts: MIXED_PATTERNS.map((row) => `${row.label} (${row.count} of ${row.total} observations)`),
    whyItMatters: "Extra visualization time may affect efficiency.",
    suggestedHypothesis: intelligence.primaryHypothesis,
    suggestedLearnItems: intelligence.whatToValidate,
    suggestedQuestions: intelligence.conversationStarters,
    providerName: "Alex Surgeon",
    procedureLabel: "Complex abdominal repair",
    strongestObservedPattern: "Extra visualization time before fixation",
    guidanceIntelligence: intelligence,
    ...overrides,
  };
}

describe("debriefPrepareWorkspace question card mapping", () => {
  it("maps generated conversationStarters into Prepare questionCards", () => {
    const intelligence = buildDebriefGuidanceIntelligence({
      patterns: MIXED_PATTERNS,
      unresolvedObservationPrompts: ["Listen for provider frustration during the case"],
      providerName: "Alex Surgeon",
    });

    const view = buildDebriefPrepareWorkspaceView({
      draft: buildDraft({
        suggestedQuestions: [],
        guidanceIntelligence: intelligence,
      }),
      saved: null,
    });

    expect(intelligence.conversationStarters.length).toBeGreaterThan(0);
    expect(view.questionCards.map((card) => card.text)).toEqual(intelligence.conversationStarters);
  });

  it("keeps Prepare and Active on the same generated questions from shared intelligence", () => {
    const draft = buildDraft();
    const view = buildDebriefPrepareWorkspaceView({ draft, saved: null });
    const guide = buildDebriefExecutionGuideFromWorkspace({ workspace: view, savedSnapshot: null });

    expect(view.questionCards.map((card) => card.text)).toEqual(view.guidanceIntelligence.conversationStarters);
    expect(guide.conversationStarters).toEqual(view.guidanceIntelligence.conversationStarters);
    expect(view.questionCards.map((card) => card.text)).toEqual(guide.conversationStarters);
  });

  it("uses empty Questions To Ask when commercial qualification is intentionally empty", () => {
    const intelligence = buildDebriefGuidanceIntelligence({
      patterns: [pattern("Staff appeared organized", 5), pattern("Incumbent mesh used consistently", 5)],
      providerName: "Alex Surgeon",
    });

    const view = buildDebriefPrepareWorkspaceView({
      draft: buildDraft({
        suggestedQuestions: [],
        suggestedLearnItems: intelligence.whatToValidate,
        suggestedHypothesis: intelligence.primaryHypothesis,
        guidanceIntelligence: intelligence,
        knownFacts: [
          "Staff appeared organized (5 of 5 observations)",
          "Incumbent mesh used consistently (5 of 5 observations)",
        ],
      }),
      saved: null,
    });
    const guide = buildDebriefExecutionGuideFromWorkspace({ workspace: view, savedSnapshot: null });

    expect(intelligence.conversationStarters).toHaveLength(0);
    expect(view.questionCards).toHaveLength(0);
    expect(guide.conversationStarters).toHaveLength(0);
  });

  it("preserves manual Prepare question edits over generated conversationStarters", () => {
    const draft = buildDraft();
    const saved = {
      meetingObjective: "",
      hypothesis: "Rep-authored hypothesis.",
      learnItems: [],
      questionCards: [{ id: "question-custom", text: "Rep-edited conversation starter?", used: false }],
      desiredOutcome: "follow_up" as const,
      desiredOutcomeOther: "",
      meetingNotes: "",
      updatedAt: "2026-06-12T12:00:00.000Z",
    };

    const view = buildDebriefPrepareWorkspaceView({ draft, saved });
    const guide = buildDebriefExecutionGuideFromWorkspace({ workspace: view, savedSnapshot: saved });

    expect(view.questionCards.some((card) => card.text === "Rep-edited conversation starter?")).toBe(true);
    expect(guide.source).toBe("saved_prepare_workspace");
    expect(guide.conversationStarters).toContain("Rep-edited conversation starter?");
  });
});
