import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  introCallDebriefFirstEndAllowed,
  mergeIntroCallSessionEndedSnapshot,
} from "@/lib/surgical-sales/engagements/introCallDebriefFirstCompletion";
import {
  loadActorDisplayName,
  recordStartMissionOutcomeForActor,
} from "@/lib/surgical-sales/engagements/recordStartMissionOutcome";
import { readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";

export type EndEngagementCallResult =
  | { ok: true; debrief_href: string }
  | { ok: false; error: string; status: 400 | 404 | 409 | 500 };

/**
 * Marks the engagement completed (debrief pending) and returns debrief URL.
 * Intro calls may end without a rep-selected outcome (debrief-first flow).
 */
export async function endEngagementCallForActor(input: {
  engagementId: string;
  userId: string;
  outcomeId?: StartMissionOutcomeId;
  liveNotes?: string;
  actorName?: string;
}): Promise<EndEngagementCallResult> {
  const engagement = await loadEngagementForPortalActor(input.engagementId, input.userId, {
    includeArchived: true,
  });
  if (!engagement) {
    return { ok: false, error: "Not found", status: 404 };
  }
  if (String(engagement.archived_at ?? "").trim()) {
    return { ok: false, error: "Engagement is archived", status: 409 };
  }

  const status = String(engagement.status ?? "planned").toLowerCase();
  if (status === "cancelled") {
    return { ok: false, error: "This engagement is cancelled.", status: 409 };
  }

  const debriefHref = buildEngagementDebriefHref(input.engagementId);

  if (status === "completed") {
    return { ok: true, debrief_href: debriefHref };
  }

  if (status !== "in_progress") {
    return { ok: false, error: "Start the engagement before ending it.", status: 409 };
  }

  const session = readStartMissionSnapshot(engagement.debrief_intelligence_snapshot);
  if (!session) {
    return { ok: false, error: "Active engagement session not open", status: 409 };
  }

  const engagementType = String(engagement.engagement_type ?? "");
  const debriefFirstEnd = introCallDebriefFirstEndAllowed({
    engagementType,
    outcomeId: input.outcomeId,
  });

  if (!session.outcome_recorded_at) {
    if (debriefFirstEnd) {
      const now = new Date().toISOString();
      const snapshot = mergeIntroCallSessionEndedSnapshot(
        engagement.debrief_intelligence_snapshot,
        now,
        input.liveNotes,
      );
      const { error: snapErr } = await supabaseAdmin
        .from("surgical_sales_engagements")
        .update({
          updated_at: now,
          debrief_intelligence_snapshot: snapshot,
        })
        .eq("id", input.engagementId);
      if (snapErr) {
        return { ok: false, error: snapErr.message, status: 500 };
      }
    } else {
      if (!input.outcomeId) {
        return { ok: false, error: "Select an outcome before ending the engagement.", status: 400 };
      }
      const actorName = input.actorName ?? (await loadActorDisplayName(input.userId));
      const outcomeResult = await recordStartMissionOutcomeForActor({
        engagementId: input.engagementId,
        userId: input.userId,
        actorName,
        outcomeId: input.outcomeId,
        liveNotes: input.liveNotes,
      });
      if (!outcomeResult.ok) {
        return { ok: false, error: outcomeResult.error, status: outcomeResult.status };
      }
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({ status: "completed", updated_at: now })
    .eq("id", input.engagementId);

  if (error) {
    return { ok: false, error: error.message || "Could not end engagement", status: 500 };
  }

  return { ok: true, debrief_href: debriefHref };
}
