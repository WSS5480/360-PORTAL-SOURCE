import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";
import {
  SALES_PATHWAY_EVALUATION_ACTIVITIES,
  type SalesPathwayEvaluationActivity,
} from "@/lib/surgical-sales/salesPathwayCanonical";

export const MISSION_BOARD_DEBRIEF_COMPLETE_SNAPSHOT_KEY = "mission_board_debrief_complete";

export const MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_IDS = [
  "touch_success",
  "touch_follow_up",
  "touch_no_progress",
] as const;

export type MissionBoardDebriefCompleteOutcomeId =
  (typeof MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_IDS)[number];

export const MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_LABELS: Record<
  MissionBoardDebriefCompleteOutcomeId,
  string
> = {
  touch_success: "Objective Met",
  touch_follow_up: "Follow Up Needed",
  touch_no_progress: "No Progress",
};

export const MISSION_BOARD_DEBRIEF_OPPORTUNITY_RESULTS = [
  "confirmed",
  "not_confirmed",
  "unknown",
] as const;

export type MissionBoardDebriefCompleteOpportunityResult =
  (typeof MISSION_BOARD_DEBRIEF_OPPORTUNITY_RESULTS)[number];

export const MISSION_BOARD_DEBRIEF_OPPORTUNITY_LABELS: Record<
  MissionBoardDebriefCompleteOpportunityResult,
  string
> = {
  confirmed: "Opportunity Confirmed",
  not_confirmed: "Opportunity Not Confirmed",
  unknown: "More Validation Needed",
};

export const MISSION_BOARD_DEBRIEF_COMPLETE_LABEL = "Complete Debrief";
export const MISSION_BOARD_DEBRIEF_DICTATE_LABEL = "Dictate";
export const MISSION_BOARD_DEBRIEF_LOG_OUTCOME_LABEL = "Log Outcome";
export const MISSION_BOARD_DEBRIEF_SAVE_COMPLETE_LABEL = "Complete Debrief";
export const MISSION_BOARD_DEBRIEF_DICTATE_COMPLETE_PANEL_TITLE = "Dictate & Complete";
export const MISSION_BOARD_DEBRIEF_DICTATION_NOTES_LABEL = "Debrief notes (optional)";
export const MISSION_BOARD_DEBRIEF_DICTATION_NOTES_PLACEHOLDER =
  "Dictate what the provider said, whether the issue matters, whether they want to move forward, and what next step was agreed on.";
export const MISSION_BOARD_DEBRIEF_NEXT_STEP_SECTION = "Optional next step";
export const MISSION_BOARD_DEBRIEF_NEXT_STEP_PLACEHOLDER =
  "Example: Schedule 360 Experience with office manager next week.";
export const MISSION_BOARD_DEBRIEF_REVIEW_LABEL = "Review Debrief";
export const MISSION_BOARD_DEBRIEF_COMPLETE_SUCCESS_TOAST = "Debrief completed.";
export const MISSION_BOARD_DEBRIEF_COMPLETE_NOTES_PLACEHOLDER =
  "What did the provider confirm, reject, or ask to do next?";

export const MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_SECTION = "Outcome";
export const MISSION_BOARD_DEBRIEF_COMPLETE_OPPORTUNITY_SECTION = "Opportunity result";
export const MISSION_BOARD_DEBRIEF_COMPLETE_PATH_SECTION = "Next path";
export const MISSION_BOARD_DEBRIEF_COMPLETE_NOTES_SECTION = "Notes";

export function isMissionBoardDebriefCompleteOutcomeId(
  value: string,
): value is MissionBoardDebriefCompleteOutcomeId {
  return (MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_IDS as readonly string[]).includes(value);
}

export function isMissionBoardDebriefCompleteOpportunityResult(
  value: string,
): value is MissionBoardDebriefCompleteOpportunityResult {
  return (MISSION_BOARD_DEBRIEF_OPPORTUNITY_RESULTS as readonly string[]).includes(value);
}

export function isMissionBoardDebriefCompleteEvaluationPath(
  value: string,
): value is SalesPathwayEvaluationActivity {
  return (SALES_PATHWAY_EVALUATION_ACTIVITIES as readonly string[]).includes(
    value as SalesPathwayEvaluationActivity,
  );
}

export function buildMissionBoardDebriefCompleteNarrative(input: {
  outcomeLabel: string;
  opportunityLabel: string;
  evaluationPath?: SalesPathwayEvaluationActivity | null;
  notes?: string | null;
}): string {
  const lines = [
    "Mission Board debrief completion",
    `Outcome: ${input.outcomeLabel}`,
    `Opportunity: ${input.opportunityLabel}`,
  ];
  if (input.evaluationPath) {
    lines.push(`Evaluation path: ${input.evaluationPath}`);
  }
  const notes = String(input.notes ?? "").trim();
  if (notes) {
    lines.push("", notes);
  }
  return lines.join("\n").trim();
}

export type MissionBoardDebriefCompleteSnapshot = {
  outcome_id: MissionBoardDebriefCompleteOutcomeId;
  opportunity_result: MissionBoardDebriefCompleteOpportunityResult;
  evaluation_path?: SalesPathwayEvaluationActivity | null;
  notes?: string | null;
  completed_at: string;
};

export function mergeMissionBoardDebriefCompleteSnapshot(
  debriefSnapshot: unknown,
  complete: MissionBoardDebriefCompleteSnapshot,
): Record<string, unknown> {
  const base =
    debriefSnapshot && typeof debriefSnapshot === "object"
      ? { ...(debriefSnapshot as Record<string, unknown>) }
      : {};
  base[MISSION_BOARD_DEBRIEF_COMPLETE_SNAPSHOT_KEY] = complete;
  return base;
}

export const MISSION_BOARD_DEBRIEF_DICTATION_SNAPSHOT_KEY = "mission_board_debrief_dictation";

export type MissionBoardDebriefDictationSnapshot = {
  dictation: string;
  saved_at: string;
  accepted_db_keys: string[];
  mapping_source?: "openai" | "keyword_fallback";
};

export function mergeMissionBoardDebriefDictationSnapshot(
  debriefSnapshot: unknown,
  dictation: MissionBoardDebriefDictationSnapshot,
): Record<string, unknown> {
  const base =
    debriefSnapshot && typeof debriefSnapshot === "object"
      ? { ...(debriefSnapshot as Record<string, unknown>) }
      : {};
  base[MISSION_BOARD_DEBRIEF_DICTATION_SNAPSHOT_KEY] = dictation;
  return base;
}

export const MISSION_BOARD_DEBRIEF_DICTATION_TITLE = "Add debrief notes";
export const MISSION_BOARD_DEBRIEF_DICTATION_SUBTITLE =
  "Optional — capture what the provider said. Intelligence is extracted with the same debrief pipeline.";
export const MISSION_BOARD_DEBRIEF_DICTATION_PLACEHOLDER =
  "Dictate or type what the provider confirmed, rejected, or asked to do next…";
export const MISSION_BOARD_DEBRIEF_DICTATION_SAVE_LABEL = "Save & Extract Intelligence";
export const MISSION_BOARD_DEBRIEF_DICTATION_SKIP_LABEL = "Skip";
export const MISSION_BOARD_DEBRIEF_DICTATION_SUCCESS_TOAST = "Debrief notes saved and intelligence extracted.";

export function mapMissionBoardDebriefOutcomeToStartMissionId(
  outcomeId: MissionBoardDebriefCompleteOutcomeId,
): StartMissionOutcomeId {
  return outcomeId;
}
