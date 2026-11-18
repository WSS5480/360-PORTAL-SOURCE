/**

 * Mission Board debrief card — status line and primary CTA (Intro Call card pattern).

 */



import {

  deriveDebriefLifecyclePrimaryAction,

  debriefLifecycleStatusLine,

  resolveDebriefLifecyclePhase,

  type DebriefLifecyclePhase,

} from "@/lib/surgical-sales/debriefEngagementLifecycle";

import type { MissionBoardPrimaryActionKind } from "@/lib/surgical-sales/deriveMissionBoardCardActions";

import {

  type ProviderDebriefEngagementPreview,

  resolveProviderDebriefEngagementPreview,

} from "@/lib/surgical-sales/missionBoardDebriefEngagement";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";



/** @deprecated Use DebriefLifecyclePhase */

export type MissionBoardDebriefCardStatusId = DebriefLifecyclePhase;



/** @deprecated Use debriefLifecycleStatusLine */

export const MISSION_BOARD_DEBRIEF_STATUS_LINE: Record<DebriefLifecyclePhase, string> = {

  not_scheduled: debriefLifecycleStatusLine("not_scheduled"),

  scheduled: debriefLifecycleStatusLine("scheduled"),

  prepared: debriefLifecycleStatusLine("prepared"),

  active: debriefLifecycleStatusLine("active"),

  complete_debrief: debriefLifecycleStatusLine("complete_debrief"),

  complete: debriefLifecycleStatusLine("complete"),

};



export type MissionBoardDebriefCardPrimaryCta = {

  label: string;

  kind: MissionBoardPrimaryActionKind;

  href: string;

  /** @deprecated Dictate panel removed — completion routes through /debrief */

  debriefLauncherPanel?: "default" | "dictate";

};



export function resolveMissionBoardDebriefCardStatus(

  debrief: ProviderDebriefEngagementPreview | null,

): DebriefLifecyclePhase {

  return resolveDebriefLifecyclePhase(debrief);

}



export function deriveMissionBoardDebriefStatusLine(

  debrief: ProviderDebriefEngagementPreview | null,

): string {

  return debriefLifecycleStatusLine(resolveDebriefLifecyclePhase(debrief));

}



export function deriveMissionBoardDebriefCardPrimaryCta(

  debrief: ProviderDebriefEngagementPreview | null,

): MissionBoardDebriefCardPrimaryCta {

  const action = deriveDebriefLifecyclePrimaryAction(debrief);

  return {

    label: action.label,

    kind: action.kind,

    href: action.href,

  };

}



export function resolveMissionBoardDebriefCardContext(provider: ProviderDirectoryRow): {

  debrief: ProviderDebriefEngagementPreview | null;

  statusId: DebriefLifecyclePhase;

  statusLine: string;

  primaryCta: MissionBoardDebriefCardPrimaryCta;

} {

  const debrief = resolveProviderDebriefEngagementPreview(provider);

  const statusId = resolveDebriefLifecyclePhase(debrief);

  const primaryCta = deriveMissionBoardDebriefCardPrimaryCta(debrief);

  return {

    debrief,

    statusId,

    statusLine: debriefLifecycleStatusLine(statusId),

    primaryCta,

  };

}



/** Card-level completion — requires debrief_completed flag (not engagement status alone). */

export function providerDebriefNotesComplete(debrief: ProviderDebriefEngagementPreview | null): boolean {

  return Boolean(debrief?.debrief_completed);

}


