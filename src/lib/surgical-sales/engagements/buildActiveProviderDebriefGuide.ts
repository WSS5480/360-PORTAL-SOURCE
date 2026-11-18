import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import type { DebriefExecutionGuide } from "@/lib/surgical-sales/engagements/debriefExecutionGuideTypes";
import {
  resolveStartMissionContent,
  type StartMissionOutcome,
  type StartMissionOutcomeId,
} from "@/lib/surgical-sales/engagements/startMissionConfig";

export type ActiveProviderDebriefGuide = {
  providerName: string;
  engagementTypeLabel: string;
  executionGuide: DebriefExecutionGuide;
  outcomes: readonly StartMissionOutcome[];
  outcomeRecorded: boolean;
  outcomeId: StartMissionOutcomeId | null;
  outcomeLabel: string | null;
  suggestedOutcomeId: StartMissionOutcomeId | null;
};

export function buildActiveProviderDebriefGuide(
  data: Pick<
    PrepareForMeetingView,
    "provider_snapshot" | "upcoming_engagement" | "provider_debrief_briefing" | "live_session" | "debrief_execution_guide"
  >,
): ActiveProviderDebriefGuide | null {
  const briefing = data.provider_debrief_briefing;
  const executionGuide = data.debrief_execution_guide;

  if (!briefing.is_provider_debrief || !executionGuide) {
    return null;
  }

  const pathway = resolveStartMissionContent({
    engagementType: data.upcoming_engagement.engagement_type,
    storedObjective: executionGuide.recommendedOutcome,
    storedPrimaryQuestion: executionGuide.conversationStarters[0] ?? null,
  });

  return {
    providerName: data.provider_snapshot.display_name,
    engagementTypeLabel: data.upcoming_engagement.type_label,
    executionGuide,
    outcomes: pathway.outcomes,
    outcomeRecorded: data.live_session?.outcome_recorded ?? false,
    outcomeId: data.live_session?.outcome_id ?? null,
    outcomeLabel: data.live_session?.outcome_label ?? null,
    suggestedOutcomeId: null,
  };
}

/** @deprecated Evidence summary removed — execution guide uses prepare workspace intelligence. */
export function buildEvidenceSummaryFromDebriefPlan(): string[] {
  return [];
}
