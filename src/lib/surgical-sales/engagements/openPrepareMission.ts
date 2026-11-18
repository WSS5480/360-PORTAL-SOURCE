import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  hasEngagementBriefingProgress,
  readStoredPlanningStatus,
  resolveEngagementPlanningStatus,
  syncEngagementPlanningPatch,
} from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import { loadPrepareForMeetingViewForActor } from "@/lib/surgical-sales/engagements/loadPrepareForMeetingView";
import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";

export type OpenPrepareMissionResult =
  | {
      ok: true;
      prepare: PrepareForMeetingView;
      engagement: Record<string, unknown>;
      briefing_opened: boolean;
      suggestions_generated_at: string;
    }
  | { ok: false; error: string; status: 404 | 500 };

/**
 * Opens (or resumes) the field briefing for an engagement and returns rule-based
 * suggested prep content. Does not write prep fields or provider intelligence.
 */
export async function openPrepareMissionForActor(
  engagementId: string,
  userId: string,
): Promise<OpenPrepareMissionResult> {
  const engagement = await loadEngagementForPortalActor(engagementId, userId, {
    includeArchived: true,
  });
  if (!engagement) {
    return { ok: false, error: "Not found", status: 404 };
  }

  const storedStatus = readStoredPlanningStatus(engagement);
  const resolvedStatus = resolveEngagementPlanningStatus(engagement);
  const needsBriefingOpen =
    storedStatus === "not_planned" &&
    resolvedStatus === "not_planned" &&
    !hasEngagementBriefingProgress(engagement);

  let briefingOpened = false;

  if (needsBriefingOpen) {
    const now = new Date().toISOString();
    const openPatch: Record<string, unknown> = {
      planning_status: "planning_in_progress",
      planning_mode: "plan_first",
      updated_at: now,
    };

    const { data: opened, error: openErr } = await supabaseAdmin
      .from("surgical_sales_engagements")
      .update(openPatch)
      .eq("id", engagementId)
      .select("*")
      .single();

    if (openErr || !opened) {
      return { ok: false, error: openErr?.message || "Could not open field briefing", status: 500 };
    }

    const synced = syncEngagementPlanningPatch(opened as Record<string, unknown>, engagementId);
    if (synced.planning_status !== String((opened as { planning_status?: string }).planning_status ?? "")) {
      await supabaseAdmin
        .from("surgical_sales_engagements")
        .update({ ...synced, updated_at: now })
        .eq("id", engagementId);
    }

    briefingOpened = true;
  }

  const loaded = await loadPrepareForMeetingViewForActor(engagementId, userId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error, status: loaded.status };
  }

  return {
    ok: true,
    prepare: loaded.prepare,
    engagement: loaded.engagement,
    briefing_opened: briefingOpened,
    suggestions_generated_at: new Date().toISOString(),
  };
}
