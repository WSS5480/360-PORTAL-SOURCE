import {
  classifyEngagementOutcomeFromDebrief,
  resolveProviderObservationStatusForEngagementOutcome,
  type ClassifiedEngagementOutcome,
} from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import { isIntroCallPathwayMission } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import {
  applyEngagementObservationOutcomeToProvider,
} from "@/lib/surgical-sales/engagements/observationApprovalFromEngagements";
import { loadActorDisplayName } from "@/lib/surgical-sales/engagements/recordStartMissionOutcome";
import {
  mergeStartMissionSnapshot,
  readStartMissionSnapshot,
} from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";
import {
  type DebriefVisitOutcomeSnapshot,
} from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";

export function isIntroCallDebriefFirstEngagementType(engagementType: string): boolean {
  return isIntroCallPathwayMission(engagementType);
}

export function isDebriefFirstOutcomeEngagementType(engagementType: string): boolean {
  return (
    isIntroCallDebriefFirstEngagementType(engagementType) ||
    isProviderDebriefEngagement(engagementType)
  );
}

/** Intro call or provider debrief active end with no rep-selected outcome. */
export function introCallDebriefFirstEndAllowed(input: {
  engagementType: string;
  outcomeId?: StartMissionOutcomeId | null;
}): boolean {
  return isDebriefFirstOutcomeEngagementType(input.engagementType) && !input.outcomeId;
}

export function mergeIntroCallSessionEndedSnapshot(
  debriefSnapshot: unknown,
  endedAt: string,
  liveNotes?: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { ended_at: endedAt };
  if (liveNotes !== undefined) {
    patch.live_notes = liveNotes;
  }
  return mergeStartMissionSnapshot(debriefSnapshot, patch);
}

export function classifyIntroCallConversationResult(narrative: string): ClassifiedEngagementOutcome {
  return classifyEngagementOutcomeFromDebrief(narrative);
}

export function resolveEngagementOutcomeAuthorityId(input: {
  engagementType: string;
  debriefSnapshot: unknown;
}): StartMissionOutcomeId | null {
  const visitId = readVisitOutcomeFromDebriefSnapshot(input.debriefSnapshot)?.outcomeId;
  if (visitId) return visitId as StartMissionOutcomeId;

  if (isDebriefFirstOutcomeEngagementType(input.engagementType)) {
    return null;
  }

  return readStartMissionSnapshot(input.debriefSnapshot)?.outcome_id ?? null;
}

export function readVisitOutcomeFromDebriefSnapshot(
  debriefSnapshot: unknown,
): DebriefVisitOutcomeSnapshot | null {
  if (!debriefSnapshot || typeof debriefSnapshot !== "object" || Array.isArray(debriefSnapshot)) {
    return null;
  }
  const row = debriefSnapshot as Record<string, unknown>;
  const visitOutcome = row.visitOutcome;
  if (!visitOutcome || typeof visitOutcome !== "object" || Array.isArray(visitOutcome)) {
    return null;
  }
  const vo = visitOutcome as Record<string, unknown>;
  const outcomeId = String(vo.outcomeId ?? "").trim();
  if (!outcomeId) return null;
  return {
    outcomeId: outcomeId as DebriefVisitOutcomeSnapshot["outcomeId"],
    label: String(vo.label ?? ""),
    rationale: String(vo.rationale ?? ""),
    recordedAt: String(vo.recordedAt ?? ""),
  };
}

/** Apply provider observation workflow from debrief-confirmed visit outcome (intro call only). */
export async function syncIntroCallProviderFromVisitOutcome(input: {
  engagement: Record<string, unknown>;
  userId: string;
  narrative: string;
}): Promise<{ updated: boolean }> {
  const engagementType = String(input.engagement.engagement_type ?? "");
  if (!isIntroCallDebriefFirstEngagementType(engagementType)) {
    return { updated: false };
  }

  const visitOutcome = readVisitOutcomeFromDebriefSnapshot(input.engagement.debrief_intelligence_snapshot);
  if (!visitOutcome?.outcomeId) {
    return { updated: false };
  }

  const providerId = String(input.engagement.provider_id ?? "").trim();
  if (!providerId) return { updated: false };

  const debriefText = input.narrative.trim();
  const observationStatus = resolveProviderObservationStatusForEngagementOutcome({
    outcomeId: visitOutcome.outcomeId as StartMissionOutcomeId,
    debriefText,
  });
  if (!observationStatus) return { updated: false };

  const actorName = await loadActorDisplayName(input.userId);
  const approvalNote = debriefText
    ? `${visitOutcome.label}: ${debriefText}`
    : visitOutcome.label;

  const applied = await applyEngagementObservationOutcomeToProvider({
    providerId,
    userId: input.userId,
    actorName,
    status: observationStatus,
    approvalNote,
    captureContext: {
      source_type: "engagement",
      source_label: visitOutcome.label,
      source_engagement_id: String(input.engagement.id ?? ""),
      declared_source_type: "debrief",
    },
  });

  return { updated: applied.ok };
}
