import { beginEngagementCallClient } from "@/lib/surgical-sales/engagements/beginEngagementCallClient";
import { endEngagementCallClient } from "@/lib/surgical-sales/engagements/endEngagementCallClient";
import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  resolveStartMissionContent,
  type StartMissionOutcomeId,
} from "@/lib/surgical-sales/engagements/startMissionConfig";

const COMPLETED_STATUSES = new Set(["completed", "done", "closed"]);
const PRE_ACTIVE_STATUSES = new Set(["planned", "scheduled", "confirmed"]);

/** Placeholder outcome for Dictate & Complete — real classification happens in debrief capture. */
export function resolveMissionBoardDictateCompleteOutcome(
  engagementType?: string | null,
): StartMissionOutcomeId {
  const content = resolveStartMissionContent({
    engagementType: String(engagementType ?? "intro_call"),
  });
  if (content.outcomes.some((outcome) => outcome.id === "no_meaningful_update")) {
    return "no_meaningful_update";
  }
  if (content.outcomes.some((outcome) => outcome.id === "touch_no_progress")) {
    return "touch_no_progress";
  }
  return content.outcomes[0]?.id ?? "no_meaningful_update";
}

/**
 * Mission Board — mark an intro call complete (begin/end if needed) before inline debrief capture.
 */
export async function prepareMissionBoardIntroCallForDebrief(input: {
  engagementId: string;
  status?: string | null;
  engagementType?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const engagementId = String(input.engagementId ?? "").trim();
  if (!engagementId) {
    return { ok: false, message: "Intro call engagement not found." };
  }

  const status = String(input.status ?? "planned").trim().toLowerCase();
  if (COMPLETED_STATUSES.has(status)) {
    return { ok: true };
  }

  if (PRE_ACTIVE_STATUSES.has(status)) {
    const begin = await beginEngagementCallClient(engagementId, { missionBoardFastLog: true });
    if (!begin.ok) return begin;
  }

  const end = await endEngagementCallClient(
    engagementId,
    resolveMissionBoardDictateCompleteOutcome(input.engagementType),
  );
  if (!end.ok) return end;
  return { ok: true };
}

/** @deprecated Prefer inline mission board modal — kept for navigation fallbacks. */
export async function openMissionBoardIntroCallDebrief(input: {
  engagementId: string;
  status?: string | null;
  engagementType?: string | null;
}): Promise<{ ok: true; debriefHref: string } | { ok: false; message: string }> {
  const engagementId = String(input.engagementId ?? "").trim();
  const result = await prepareMissionBoardIntroCallForDebrief(input);
  if (!result.ok) return result;
  return { ok: true, debriefHref: buildEngagementDebriefHref(engagementId) };
}
