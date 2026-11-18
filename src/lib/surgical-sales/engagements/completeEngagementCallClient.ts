import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";
import { endEngagementCallClient } from "@/lib/surgical-sales/engagements/endEngagementCallClient";

/** @deprecated Use endEngagementCallClient with a selected outcome */
export async function completeEngagementCallClient(
  engagementId: string,
  outcomeId: StartMissionOutcomeId,
  liveNotes?: string,
): Promise<{ ok: true; debriefHref: string } | { ok: false; message: string }> {
  return endEngagementCallClient(engagementId, outcomeId, liveNotes);
}