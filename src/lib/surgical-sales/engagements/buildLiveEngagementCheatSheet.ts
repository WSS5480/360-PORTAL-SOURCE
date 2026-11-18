import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { resolveEngagementObjective } from "@/lib/surgical-sales/engagements/buildEngagementRecordView";
import { isIntroCallPathwayMission, resolveIntroCallMissionGoalDisplay } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import {
  readTodayMatterSavedValueFromPlan,
} from "@/lib/surgical-sales/engagements/prepareWhatMattersEditable";
import { splitProbeLines } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";
import { asksForFieldExecution } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import { classifyEngagementOutcomeFromDebrief } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import {
  resolveStartMissionContent,
  type StartMissionOutcome,
  type StartMissionOutcomeId,
} from "@/lib/surgical-sales/engagements/startMissionConfig";

export type LiveEngagementCheatSheetModel = {
  providerName: string;
  engagementTypeLabel: string;
  missionGoal: string;
  primaryQuestion: string;
  secondaryQuestions: string[];
  outcomes: readonly StartMissionOutcome[];
  liveNotes: string;
  outcomeRecorded: boolean;
  outcomeId: StartMissionOutcomeId | null;
  outcomeLabel: string | null;
  suggestedOutcomeId: StartMissionOutcomeId | null;
  suggestedOutcomeLabel: string | null;
};

export function buildLiveEngagementCheatSheet(
  data: Pick<
    PrepareForMeetingView,
    | "plan_fields"
    | "tactical_asks"
    | "upcoming_engagement"
    | "provider_snapshot"
    | "suggested_goal"
    | "live_session"
  >,
  engagement?: Record<string, unknown> | null,
): LiveEngagementCheatSheetModel {
  const engagementType = data.upcoming_engagement.engagement_type;
  const isIntro = isIntroCallPathwayMission(engagementType);
  const activeAsks = asksForFieldExecution(data.tactical_asks);

  const missionGoal = isIntro
    ? resolveIntroCallMissionGoalDisplay(data.plan_fields.observation_goal)
    : readTodayMatterSavedValueFromPlan("discovery_goal", data.plan_fields, engagementType) ||
      resolveEngagementObjective(engagement ?? {}) ||
      data.suggested_goal.goal?.trim() ||
      "Execute this touchpoint.";

  const pathway = resolveStartMissionContent({
    engagementType,
    storedObjective: missionGoal,
    storedPrimaryQuestion: activeAsks[0]?.text ?? null,
  });

  const savedProbeLines = splitProbeLines(data.plan_fields.pre_observation_probes);
  const primaryFromAsks = activeAsks[0]?.text?.trim() || "";
  const secondaryFromAsks = activeAsks.slice(1).map((a) => a.text.trim()).filter(Boolean);

  const primaryQuestion =
    primaryFromAsks ||
    savedProbeLines[0]?.trim() ||
    pathway.primary_question;
  const secondaryQuestions =
    secondaryFromAsks.length > 0
      ? secondaryFromAsks
      : savedProbeLines.length > 1
        ? savedProbeLines.slice(1).map((line) => line.trim()).filter(Boolean)
        : [...pathway.secondary_questions];

  const liveNotes = data.live_session?.live_notes ?? "";
  const classified = classifyEngagementOutcomeFromDebrief(liveNotes);
  const suggestedOutcomeId = pathway.outcomes.some((o) => o.id === classified.outcomeId)
    ? (classified.outcomeId as StartMissionOutcomeId)
    : null;

  return {
    providerName: data.provider_snapshot.display_name,
    engagementTypeLabel: data.upcoming_engagement.type_label,
    missionGoal,
    primaryQuestion,
    secondaryQuestions,
    outcomes: pathway.outcomes,
    liveNotes,
    outcomeRecorded: data.live_session?.outcome_recorded ?? false,
    outcomeId: data.live_session?.outcome_id ?? null,
    outcomeLabel: data.live_session?.outcome_label ?? null,
    suggestedOutcomeId,
    suggestedOutcomeLabel: suggestedOutcomeId ? classified.label : null,
  };
}
