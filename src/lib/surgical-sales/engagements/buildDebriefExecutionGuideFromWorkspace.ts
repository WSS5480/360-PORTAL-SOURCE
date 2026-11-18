import {
  DEBRIEF_PREPARE_DESIRED_OUTCOMES,
  type DebriefPrepareWorkspaceSnapshot,
  type DebriefPrepareWorkspaceView,
} from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";
import type {
  DebriefExecutionGuide,
  DebriefExecutionGuideSource,
} from "@/lib/surgical-sales/engagements/debriefExecutionGuideTypes";
import { rebuildDebriefGuidanceIntelligenceFromWorkspaceDraft } from "@/lib/surgical-sales/engagements/buildDebriefGuidanceIntelligence";
import { formatDebriefObservedFact } from "@/lib/surgical-sales/engagements/debriefGuidanceFormatUtils";

/** @deprecated Use formatDebriefObservedFact */
export const formatObservedFactForActiveGuide = formatDebriefObservedFact;

function resolveRecommendedOutcomeLabel(
  workspace: DebriefPrepareWorkspaceView,
  intelligenceRecommendedOutcome: string,
): string {
  if (workspace.desiredOutcome === "other") {
    const other = workspace.desiredOutcomeOther.trim();
    if (other) return other;
  }

  if (workspace.desiredOutcome) {
    const match = DEBRIEF_PREPARE_DESIRED_OUTCOMES.find((row) => row.id === workspace.desiredOutcome);
    if (match) return match.label;
  }

  return intelligenceRecommendedOutcome;
}

function resolveExecutionGuideSource(
  saved: DebriefPrepareWorkspaceSnapshot | null,
): DebriefExecutionGuideSource {
  if (!saved?.updatedAt) {
    return "generated_from_observation_patterns";
  }

  const hasSavedContent = Boolean(
    saved.hypothesis?.trim() ||
      saved.meetingObjective?.trim() ||
      saved.learnItems.some((item) => item.text.trim()) ||
      saved.questionCards.some((item) => item.text.trim()) ||
      saved.desiredOutcome,
  );

  return hasSavedContent ? "saved_prepare_workspace" : "generated_from_observation_patterns";
}

function sanitizeGuideLines(lines: string[]): string[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 6);
}

export function buildDebriefExecutionGuideFromWorkspace(input: {
  workspace: DebriefPrepareWorkspaceView;
  savedSnapshot?: DebriefPrepareWorkspaceSnapshot | null;
}): DebriefExecutionGuide {
  const { workspace } = input;
  const savedSnapshot = input.savedSnapshot ?? workspace.rep;
  const source = resolveExecutionGuideSource(savedSnapshot);
  const preserveRepEdits = source === "saved_prepare_workspace";

  const intelligence =
    workspace.guidanceIntelligence ??
    workspace.draft.guidanceIntelligence ??
    rebuildDebriefGuidanceIntelligenceFromWorkspaceDraft({
      knownFacts: workspace.knownFacts,
      providerName: workspace.draft.providerName,
      procedureLabel: workspace.draft.procedureLabel,
      desiredOutcome: workspace.desiredOutcome,
    });

  return {
    meetingObjective: workspace.meetingObjective?.trim() || null,
    whatWeObserved: sanitizeGuideLines(intelligence.whatWeObserved),
    whatToValidate: sanitizeGuideLines(
      preserveRepEdits
        ? workspace.learnItems.map((item) => item.text)
        : intelligence.whatToValidate,
    ),
    conversationStarters: sanitizeGuideLines(
      preserveRepEdits
        ? workspace.questionCards.map((card) => card.text)
        : intelligence.conversationStarters,
    ),
    recommendedOutcome: resolveRecommendedOutcomeLabel(workspace, intelligence.recommendedOutcome),
    primaryHypothesis: preserveRepEdits
      ? workspace.hypothesis?.trim() || null
      : intelligence.primaryHypothesis,
    source,
    guidanceIntelligence: intelligence,
  };
}
