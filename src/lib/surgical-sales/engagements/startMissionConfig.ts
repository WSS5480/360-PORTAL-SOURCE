import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export type StartMissionOutcomeId =
  | "observation_approved"
  | "follow_up_needed"
  | "observation_denied"
  | "no_meaningful_update"
  | "touch_success"
  | "touch_follow_up"
  | "touch_no_progress";

export type StartMissionOutcome = {
  id: StartMissionOutcomeId;
  label: string;
  tone: "success" | "neutral" | "negative";
};

export type StartMissionContent = {
  objective: string;
  primary_question: string;
  secondary_questions: readonly string[];
  outcomes: readonly StartMissionOutcome[];
};

export const INTRO_CALL_START_MISSION_OBJECTIVE =
  "Earn permission to observe their cases and learn whether our products could fit.";

export const INTRO_CALL_START_MISSION_PRIMARY_QUESTION =
  "Would you be open to allowing me to observe one of your upcoming cases?";

export const INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS = [
  "Which case types would you be most comfortable having us observe?",
  "What would you want us to pay attention to if we watched one of your cases?",
  "Where does workflow friction show up most in the procedures you run every week?",
] as const;

export const INTRO_CALL_START_MISSION_OUTCOMES: readonly StartMissionOutcome[] = [
  { id: "observation_approved", label: "Observation Approved", tone: "success" },
  { id: "follow_up_needed", label: "Follow Up Needed", tone: "neutral" },
  { id: "observation_denied", label: "Observation Denied", tone: "negative" },
  { id: "no_meaningful_update", label: "No Meaningful Update", tone: "negative" },
] as const;

const GENERIC_START_MISSION_OUTCOMES: readonly StartMissionOutcome[] = [
  { id: "touch_success", label: "Objective Met", tone: "success" },
  { id: "touch_follow_up", label: "Follow Up Needed", tone: "neutral" },
  { id: "touch_no_progress", label: "No Progress", tone: "negative" },
] as const;

export function resolveStartMissionContent(input: {
  engagementType: string;
  storedObjective?: string | null;
  storedPrimaryQuestion?: string | null;
}): StartMissionContent {
  const type = normalizeEngagementType(input.engagementType);
  if (type === "intro_call") {
    return {
      objective: INTRO_CALL_START_MISSION_OBJECTIVE,
      primary_question: INTRO_CALL_START_MISSION_PRIMARY_QUESTION,
      secondary_questions: INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS,
      outcomes: INTRO_CALL_START_MISSION_OUTCOMES,
    };
  }

  const objective = String(input.storedObjective ?? "").trim() || "Execute this touchpoint.";
  const primaryQuestion =
    String(input.storedPrimaryQuestion ?? "").trim() || "What is the one thing you need to learn or confirm?";

  return {
    objective,
    primary_question: primaryQuestion,
    secondary_questions: [],
    outcomes: GENERIC_START_MISSION_OUTCOMES,
  };
}

/** @deprecated Prefer resolveProviderObservationStatusForEngagementOutcome with debrief text. */
export function startMissionOutcomeObservationStatus(
  outcomeId: StartMissionOutcomeId,
): "approved" | "discussed" | "denied" | null {
  switch (outcomeId) {
    case "observation_approved":
    case "touch_success":
      return "approved";
    case "follow_up_needed":
    case "touch_follow_up":
      return "discussed";
    case "observation_denied":
      return "denied";
    case "no_meaningful_update":
    case "touch_no_progress":
      return null;
    default:
      return null;
  }
}
