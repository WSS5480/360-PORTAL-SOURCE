import type { ObservationMissionBriefingPillarId } from "@/lib/surgical-sales/buildObservationMissionBriefing";
import {
  OBSERVATION_MISSION_BRIEFING_LABELS,
  OBSERVATION_MISSION_BRIEFING_SECTION_LABELS,
} from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationBriefingDraftDefaultValue } from "@/lib/surgical-sales/observationBriefingDefaults";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  appendObservationObjectiveChip,
  appendObservationSignalsLine,
  observationObjectivesFromCaseRow,
  splitDelimitedObjectiveLines,
} from "@/lib/surgical-sales/observationObjectives";

export type ObservationBriefingEditablePillarId = ObservationMissionBriefingPillarId;

export type ObservationBriefingSectionConfig = {
  id: ObservationBriefingEditablePillarId;
  title: string;
  emptyHint: string;
  placeholder: string;
  multiline: boolean;
  suggestionMode: "paragraph" | "lines";
};

export const OBSERVATION_BRIEFING_SECTIONS: ObservationBriefingSectionConfig[] = [
  {
    id: "why_here",
    title: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.whyHere,
    emptyHint: OBSERVATION_MISSION_BRIEFING_LABELS.whyHereEmpty,
    placeholder: "Assess product fit during General Surgery.",
    multiline: true,
    suggestionMode: "paragraph",
  },
  {
    id: "watch_signals",
    title: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.watchSignals,
    emptyHint: OBSERVATION_MISSION_BRIEFING_LABELS.watchSignalsEmpty,
    placeholder: "Current products used\nCompetitor products\nWorkflow bottlenecks",
    multiline: true,
    suggestionMode: "lines",
  },
  {
    id: "still_to_learn",
    title: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.stillToLearn,
    emptyHint: OBSERVATION_MISSION_BRIEFING_LABELS.stillToLearnEmpty,
    placeholder: "What products are currently being used?\nWhat frustrates the surgeon?",
    multiline: true,
    suggestionMode: "lines",
  },
  {
    id: "opportunities",
    title: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.opportunities,
    emptyHint: OBSERVATION_MISSION_BRIEFING_LABELS.opportunitiesEmpty,
    placeholder:
      "Potential fit opportunity exists if workflow friction or clinical pain points are observed.",
    multiline: true,
    suggestionMode: "lines",
  },
];

export function observationBriefingSectionConfig(
  pillarId: ObservationBriefingEditablePillarId,
): ObservationBriefingSectionConfig {
  return OBSERVATION_BRIEFING_SECTIONS.find((section) => section.id === pillarId)!;
}

export function observationBriefingDraftValue(
  pillarId: ObservationBriefingEditablePillarId,
  caseRow: Record<string, unknown>,
  engagement?: Record<string, unknown> | null,
  context?: {
    providerContact?: Record<string, unknown> | null;
    providerIntelligence?: ProviderIntelligenceSnapshot | null;
    planning?: ProviderPlanningCompletion | null;
    procedureLabel?: string | null;
  },
): string {
  const saved = (() => {
    const objectives = observationObjectivesFromCaseRow(caseRow);

    switch (pillarId) {
      case "why_here":
        return objectives.observation_goal || String(engagement?.observation_goal ?? "").trim();
      case "watch_signals":
        return objectives.observation_signals_to_validate;
      case "still_to_learn":
        return (
          objectives.observation_key_questions || String(engagement?.pre_observation_probes ?? "").trim()
        );
      case "opportunities":
        return String(
          caseRow.pre_observation_value_hypothesis ?? engagement?.pre_observation_value_hypothesis ?? "",
        ).trim();
      case "after_observation": {
        const close = String(
          caseRow.pre_observation_planned_close ?? engagement?.pre_observation_planned_close ?? "",
        ).trim();
        const notes = String(
          caseRow.pre_observation_additional_notes ?? engagement?.pre_observation_additional_notes ?? "",
        ).trim();
        return [close, notes].filter(Boolean).join("\n");
      }
      default:
        return "";
    }
  })();

  if (saved.trim()) return saved;

  return observationBriefingDraftDefaultValue(pillarId, {
    caseRow,
    engagement,
    providerContact: context?.providerContact,
    providerIntelligence: context?.providerIntelligence,
    planning: context?.planning,
    procedureLabel: context?.procedureLabel,
  });
}

export function observationBriefingPatchForDraft(
  pillarId: ObservationBriefingEditablePillarId,
  draft: string,
): Record<string, string | null> {
  const trimmed = draft.trim();

  switch (pillarId) {
    case "why_here":
      return { observation_goal: trimmed || null };
    case "watch_signals":
      return { observation_signals_to_validate: trimmed || null };
    case "still_to_learn":
      return { observation_key_questions: trimmed || null };
    case "opportunities":
      return { pre_observation_value_hypothesis: trimmed || null };
    case "after_observation": {
      const lines = splitDelimitedObjectiveLines(trimmed);
      const close = lines[0] ?? null;
      const notes = lines.length > 1 ? lines.slice(1).join("\n") : null;
      return {
        pre_observation_planned_close: close,
        pre_observation_additional_notes: notes,
      };
    }
    default:
      return {};
  }
}

export function applyObservationBriefingSuggestion(
  pillarId: ObservationBriefingEditablePillarId,
  currentDraft: string,
  suggestion: string,
  mode: "insert" | "replace",
): string {
  const text = suggestion.trim();
  if (!text) return currentDraft;

  if (pillarId === "why_here") {
    if (mode === "replace" || !currentDraft.trim()) return text;
    return appendObservationObjectiveChip(currentDraft, text);
  }

  if (mode === "replace" || !currentDraft.trim()) {
    return text;
  }

  if (pillarId === "watch_signals") {
    return appendObservationSignalsLine(currentDraft, text);
  }

  const lines = splitDelimitedObjectiveLines(currentDraft);
  const lower = text.toLowerCase();
  if (lines.some((line) => line.toLowerCase() === lower)) {
    return lines.join("\n");
  }
  return lines.length ? `${lines.join("\n")}\n${text}` : text;
}

export function observationBriefingStatusLabel(
  status: "needs_input" | "prefilled" | "review" | "ready" | "in_progress" | "complete",
): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "in_progress":
      return "In progress";
    case "ready":
      return "Briefed";
    case "review":
      return "Review";
    case "prefilled":
      return "Pre-filled";
    default:
      return "Needs input";
  }
}
