import {
  formatRepFacingDisplayText,
  isMachineGeneratedIntelligenceLabel,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { observationObjectivesFromCaseRow } from "@/lib/surgical-sales/observationObjectives";
import { observationWatchItemsFromCaseRow } from "@/lib/surgical-sales/observationWatchItems";
export type ObservationOverviewGoalSource = "case" | "provider_signal" | "engagement";

export type ObservationOverviewGoal = {
  id: string;
  text: string;
  source: ObservationOverviewGoalSource;
};

function splitObjectiveLines(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatGoalDisplayText(text: string, dbKey?: string): string | null {
  const formatted = formatRepFacingDisplayText(text, dbKey);
  if (formatted) return formatted;
  const trimmed = text.trim();
  if (!trimmed || isMachineGeneratedIntelligenceLabel(trimmed)) return null;
  return trimmed;
}

function pushGoal(
  goals: ObservationOverviewGoal[],
  seen: Set<string>,
  id: string,
  text: string,
  source: ObservationOverviewGoalSource,
  dbKey?: string,
) {
  const display = formatGoalDisplayText(text, dbKey);
  if (!display) return;
  const key = display.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  goals.push({ id, text: display, source });
}

export function buildObservationOverviewGoals(
  caseRow: Record<string, unknown>,
  engagement: Record<string, unknown> | null | undefined,
): ObservationOverviewGoal[] {
  const goals: ObservationOverviewGoal[] = [];
  const seen = new Set<string>();
  const objectives = observationObjectivesFromCaseRow(caseRow);

  pushGoal(goals, seen, "case-goal", objectives.observation_goal, "case");
  for (const [index, line] of splitObjectiveLines(objectives.observation_key_questions).entries()) {
    pushGoal(goals, seen, `case-question-${index}`, line, "case");
  }

  for (const item of observationWatchItemsFromCaseRow(caseRow)) {
    if (item.source !== "provider_signal") continue;
    pushGoal(goals, seen, `signal-${item.id}`, item.label, "provider_signal", "provider_evaluation_openness");
  }

  if (engagement) {
    pushGoal(goals, seen, "engagement-goal", String(engagement.observation_goal ?? ""), "engagement");
    for (const [index, line] of splitObjectiveLines(engagement.pre_observation_probes).entries()) {
      pushGoal(goals, seen, `engagement-probe-${index}`, line, "engagement");
    }
    for (const [index, line] of splitObjectiveLines(engagement.pre_observation_value_hypothesis).entries()) {
      pushGoal(goals, seen, `engagement-hypothesis-${index}`, line, "engagement");
    }
  }

  return goals;
}

export function observationOverviewGoalSourceLabel(source: ObservationOverviewGoalSource): string {
  if (source === "provider_signal") return "Carried forward";
  if (source === "engagement") return "From engagement";
  return "Case objective";
}
