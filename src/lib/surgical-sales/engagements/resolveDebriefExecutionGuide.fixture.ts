import type { DebriefPrepareObservedPattern } from "./buildDebriefPrepareObservedProgramFacts";
import {
  buildDebriefPrepareWorkspaceView,
  type DebriefPrepareWorkspaceDraft,
  type DebriefPrepareWorkspaceSnapshot,
} from "./debriefPrepareWorkspace";
import {
  buildHypothesisDraft,
  buildPrioritizedLearnItems,
  buildPrioritizedSuggestedQuestions,
} from "./debriefPreparePlanningAssist";

function pattern(label: string, count: number, total = 5): DebriefPrepareObservedPattern {
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

export function buildSampleWorkspaceFixture(saved: DebriefPrepareWorkspaceSnapshot | null = null) {
  return buildDebriefPrepareWorkspaceView({
    draft: buildSampleDraft(),
    saved,
  });
}

/** @deprecated Use buildSampleWorkspaceFixture */
export const buildDrLettuceWorkspaceFixture = buildSampleWorkspaceFixture;
