/**

 * Shared Mission Board engagement command abstractions.

 *

 * Mirrors the Prepare Intro Call mission command pattern:

 * - brief sections (objective, what we know, biggest unknown, opening question)

 * - primary / secondary / completion actions derived from engagement lifecycle

 * - read-only view load (no status mutation until explicit action)

 */



import {

  buildEngagementActiveHref,

  buildEngagementDebriefHref,

  buildEngagementPrepareForMeetingHref,

} from "@/lib/surgical-sales/engagements/engagementLifecycle";

import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import {

  DEBRIEF_COMPLETE_LABEL,

  DEBRIEF_PREPARE_LABEL,

  debriefLifecyclePrimaryLabel,

  deriveDebriefLifecyclePrimaryAction,

  resolveDebriefLifecyclePhase,

} from "@/lib/surgical-sales/debriefEngagementLifecycle";

import {

  resolveProviderDebriefEngagementPreview,

  type ProviderDebriefEngagementPreview,

} from "@/lib/surgical-sales/missionBoardDebriefEngagement";

import { MISSION_BOARD_DEBRIEF_REVIEW_LABEL } from "@/lib/surgical-sales/missionBoardDebriefComplete";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";



/** Section labels shared across intro call and debrief mission command surfaces. */

export const MISSION_COMMAND_OBJECTIVE_LABEL = "Objective";

export const MISSION_COMMAND_WHAT_WE_KNOW_LABEL = "What We Know";

export const MISSION_COMMAND_BIGGEST_UNKNOWN_LABEL = "Biggest Unknown";

export const MISSION_COMMAND_OPENING_QUESTION_LABEL = "Suggested Opening Question";



export type MissionBoardEngagementCommandBrief = {

  objective: string;

  whatWeKnow: string[];

  biggestUnknown: string | null;

  suggestedOpeningQuestion: string | null;

};



export type MissionBoardEngagementCommandActions = {

  engagementId: string | null;

  status: string | null;

  primaryLabel: string;

  prepareHref: string | null;

  activeHref: string | null;

  debriefReviewHref: string | null;

  /** Scheduled debrief — secondary Prepare Full Briefing. */

  showPrepareFullBriefing: boolean;

  /** Active or debrief-needed — route to /debrief completion (no inline bypass). */

  showCompleteDebrief: boolean;

  /** @deprecated Use showCompleteDebrief */

  showDictateAndComplete: boolean;

  /** Tactical debrief saved — review-only, no start/complete. */

  isComplete: boolean;

  resume: boolean;

};



function engagementSortTimestamp(row: ProviderEngagementSummary): number {

  const raw = row.updated_at || row.scheduled_at || (row.engagement_date ? `${row.engagement_date}T12:00:00` : "");

  const t = new Date(raw).getTime();

  return Number.isNaN(t) ? 0 : t;

}



/** Latest provider_debrief engagement from summary rows (overview / pathway context). */

export function resolveProviderDebriefEngagementFromSummaries(

  engagements: ProviderEngagementSummary[] | undefined,

): ProviderDebriefEngagementPreview | null {

  const debriefRows = (engagements ?? [])

    .filter((row) => isProviderDebriefEngagement(String(row.engagement_type ?? "")))

    .sort((a, b) => engagementSortTimestamp(b) - engagementSortTimestamp(a));



  const latest = debriefRows[0];

  if (!latest?.id) return null;



  return {

    id: String(latest.id),

    status: String(latest.status ?? "planned"),

    debrief_completed: Boolean(latest.debrief_completed),

    prepared_at: latest.prepared_at ?? null,

    planning_status: latest.planning_status ?? null,

  };

}



export function resolveProviderDebriefEngagementForCommand(input: {

  provider?: ProviderDirectoryRow | null;

  engagements?: ProviderEngagementSummary[];

}): ProviderDebriefEngagementPreview | null {

  if (input.provider) {

    const fromDirectory = resolveProviderDebriefEngagementPreview(input.provider);

    if (fromDirectory) return fromDirectory;

  }

  return resolveProviderDebriefEngagementFromSummaries(input.engagements);

}



export function resolveDebriefMissionCommandPrimaryLabel(

  debrief: ProviderDebriefEngagementPreview | null,

): string {

  return deriveDebriefLifecyclePrimaryAction(debrief).label;

}



export function buildDebriefMissionCommandActions(input: {

  debrief: ProviderDebriefEngagementPreview | null;

  debriefCompletedOverride?: boolean;

}): MissionBoardEngagementCommandActions {

  const debrief = input.debrief;

  if (!debrief?.id) {

    return {

      engagementId: null,

      status: null,

      primaryLabel: resolveDebriefMissionCommandPrimaryLabel(null),

      prepareHref: null,

      activeHref: null,

      debriefReviewHref: null,

      showPrepareFullBriefing: false,

      showCompleteDebrief: false,

      showDictateAndComplete: false,

      isComplete: false,

      resume: false,

    };

  }



  const phase = resolveDebriefLifecyclePhase(debrief);

  const isComplete = input.debriefCompletedOverride ?? phase === "complete";

  const status = String(debrief.status ?? "planned").trim().toLowerCase();

  const showPrepareFullBriefing = !isComplete && phase === "scheduled";

  const showCompleteDebrief = !isComplete && (phase === "active" || phase === "complete_debrief");



  return {

    engagementId: debrief.id,

    status,

    primaryLabel: isComplete

      ? MISSION_BOARD_DEBRIEF_REVIEW_LABEL

      : debriefLifecyclePrimaryLabel(phase),

    prepareHref: buildEngagementPrepareForMeetingHref(debrief.id),

    activeHref: buildEngagementActiveHref(debrief.id),

    debriefReviewHref: buildEngagementDebriefHref(debrief.id, isComplete),

    showPrepareFullBriefing,

    showCompleteDebrief,

    showDictateAndComplete: showCompleteDebrief,

    isComplete,

    resume: phase === "active",

  };

}



export const DEBRIEF_MISSION_COMMAND_SECONDARY_PREPARE = DEBRIEF_PREPARE_LABEL;

export const DEBRIEF_MISSION_COMMAND_SECONDARY_COMPLETE = DEBRIEF_COMPLETE_LABEL;

/** @deprecated Use DEBRIEF_MISSION_COMMAND_SECONDARY_COMPLETE */

export const DEBRIEF_MISSION_COMMAND_SECONDARY_DICTATE = DEBRIEF_COMPLETE_LABEL;


