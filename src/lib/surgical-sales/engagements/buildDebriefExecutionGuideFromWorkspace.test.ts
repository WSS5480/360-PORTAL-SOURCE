import { describe, expect, it } from "vitest";
import {
  buildDebriefExecutionGuideFromWorkspace,
  formatObservedFactForActiveGuide,
} from "./buildDebriefExecutionGuideFromWorkspace";
import { guideContainsObservationInstructions } from "./buildProviderDebriefConversationGuide";
import {
  buildDebriefPrepareWorkspaceView,
  type DebriefPrepareWorkspaceDraft,
  type DebriefPrepareWorkspaceSnapshot,
} from "./debriefPrepareWorkspace";
import type { DebriefPrioritizedPattern } from "./debriefIntelligencePrioritization";
import {
  buildHypothesisDraft,
  buildPrioritizedLearnItems,
  buildPrioritizedSuggestedQuestions,
} from "./debriefPreparePlanningAssist";

function pattern(label: string, count: number, total = 5): DebriefPrioritizedPattern {
  return { label, count, total, importance: 0 };
}

const SAMPLE_PATTERNS = [
  pattern("Incumbent mesh used consistently", 5),
  pattern("Extra visualization time before fixation", 2),
  pattern("Staff appeared comfortable with current process", 5),
];

function buildSampleDraft(): DebriefPrepareWorkspaceDraft {
  const knownFacts = SAMPLE_PATTERNS.map((row) => `${row.label} (${row.count} of ${row.total} observations)`);
  const planningContext = {
    draft: {
      meetingObjective: "",
      knownFacts,
      whyItMatters: "",
      suggestedHypothesis: "",
      suggestedLearnItems: [],
      suggestedQuestions: [],
      providerName: "Alex Surgeon",
      procedureLabel: "Complex abdominal repair",
      strongestObservedPattern: "Extra visualization time before fixation",
    },
    patterns: SAMPLE_PATTERNS,
    providerName: "Alex Surgeon",
    procedureLabel: "Complex abdominal repair",
  };

  return {
    ...planningContext.draft,
    suggestedHypothesis: buildHypothesisDraft(planningContext),
    suggestedLearnItems: buildPrioritizedLearnItems(planningContext),
    suggestedQuestions: buildPrioritizedSuggestedQuestions(planningContext),
  };
}

function buildSampleWorkspace(saved: DebriefPrepareWorkspaceSnapshot | null = null) {
  return buildDebriefPrepareWorkspaceView({
    draft: buildSampleDraft(),
    saved,
  });
}

describe("formatObservedFactForActiveGuide", () => {
  it("softens inconsistent observed patterns", () => {
    expect(formatObservedFactForActiveGuide("Extra visualization time before fixation (2 of 5 observations)")).toMatch(
      /in some cases, but not consistently/i,
    );
  });

  it("keeps positive workflow signals as neutral context", () => {
    expect(
      formatObservedFactForActiveGuide("Staff appeared comfortable with current process (5 of 5 observations)"),
    ).toMatch(/Staff appeared comfortable with current process/i);
    expect(
      formatObservedFactForActiveGuide("Staff appeared comfortable with current process (5 of 5 observations)"),
    ).not.toMatch(/problem|friction|pain/i);
  });

  it("rewrites consistent product usage into rep-friendly copy", () => {
    expect(formatObservedFactForActiveGuide("Incumbent mesh used consistently (5 of 5 observations)")).toBe(
      "Incumbent mesh was used across observed cases.",
    );
  });
});

describe("buildDebriefExecutionGuideFromWorkspace", () => {
  it("generates an intelligent guide when Prepare was skipped", () => {
    const guide = buildDebriefExecutionGuideFromWorkspace({
      workspace: buildSampleWorkspace(),
      savedSnapshot: null,
    });

    expect(guide.source).toBe("generated_from_observation_patterns");
    expect(guide.whatWeObserved.some((line) => /Incumbent mesh was used across observed cases/i.test(line))).toBe(true);
    expect(guide.whatWeObserved.some((line) => /in some cases, but not consistently/i.test(line))).toBe(true);
    expect(guide.whatToValidate.length).toBeGreaterThan(0);
    expect(guide.conversationStarters.length).toBeGreaterThan(0);
    expect(guideContainsObservationInstructions(guide)).toBe(false);
  });

  it("uses saved Prepare workspace when rep edits exist", () => {
    const saved: DebriefPrepareWorkspaceSnapshot = {
      meetingObjective: "",
      hypothesis: "",
      learnItems: [{ id: "learn-custom", text: "Rep-edited validation goal", checked: false }],
      questionCards: [{ id: "question-custom", text: "Rep-edited conversation starter?", used: false }],
      desiredOutcome: "follow_up",
      desiredOutcomeOther: "",
      meetingNotes: "",
      updatedAt: "2026-06-12T12:00:00.000Z",
    };

    const guide = buildDebriefExecutionGuideFromWorkspace({
      workspace: buildSampleWorkspace(saved),
      savedSnapshot: saved,
    });

    expect(guide.source).toBe("saved_prepare_workspace");
    expect(guide.whatToValidate).toContain("Rep-edited validation goal");
    expect(guide.conversationStarters).toContain("Rep-edited conversation starter?");
    expect(guide.recommendedOutcome).toBe("Follow-Up");
  });

  it("does not promote weak signals into strong workflow pain language", () => {
    const guide = buildDebriefExecutionGuideFromWorkspace({
      workspace: buildSampleWorkspace(),
    });

    const combined = [
      ...guide.whatWeObserved,
      ...guide.whatToValidate,
      ...guide.conversationStarters,
      guide.primaryHypothesis ?? "",
    ].join(" ");

    expect(combined).not.toMatch(/Determine whether extra time spent establishing visualization/i);
    expect(combined).not.toMatch(/creating a meaningful workflow challenge/i);
    expect(guideContainsObservationInstructions(guide)).toBe(false);
  });

  it("treats staff organized as context rather than a problem to solve", () => {
    const guide = buildDebriefExecutionGuideFromWorkspace({
      workspace: buildSampleWorkspace(),
    });

    expect(guide.whatWeObserved.some((line) => /Staff appeared comfortable/i.test(line))).toBe(true);
    expect(guide.whatToValidate.join(" ")).not.toMatch(/staff appeared comfortable|staff workflow/i);
    expect(guide.conversationStarters.join(" ")).not.toMatch(/staff appeared comfortable|staff workflow/i);
  });

  it("uses continue-discovery outcome for possible challenges and preserves saved outcome choices", () => {
    const generated = buildDebriefExecutionGuideFromWorkspace({
      workspace: buildSampleWorkspace(),
    });
    expect(generated.recommendedOutcome).toBe("Follow Up / Continue Discovery");

    const savedSnapshot: DebriefPrepareWorkspaceSnapshot = {
      meetingObjective: "",
      hypothesis: "",
      learnItems: [],
      questionCards: [],
      desiredOutcome: "evaluation_case",
      desiredOutcomeOther: "",
      meetingNotes: "",
      updatedAt: "2026-06-12T12:00:00.000Z",
    };

    const saved = buildDebriefExecutionGuideFromWorkspace({
      workspace: buildSampleWorkspace(savedSnapshot),
      savedSnapshot,
    });
    expect(saved.recommendedOutcome).toBe("Evaluation Case");
  });
});
