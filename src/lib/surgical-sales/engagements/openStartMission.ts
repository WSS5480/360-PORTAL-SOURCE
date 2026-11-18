import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { loadStartMissionViewForActor } from "@/lib/surgical-sales/engagements/loadStartMissionView";
import type { StartMissionView } from "@/lib/surgical-sales/engagements/buildStartMissionView";
import { mergeStartMissionSnapshot, readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";

export type OpenStartMissionResult =
  | {
      ok: true;
      live: StartMissionView;
      session_opened: boolean;
      opened_at: string;
    }
  | { ok: false; error: string; status: 404 | 409 | 500 };

/**
 * Opens live execution mode for an engagement.
 * Does not load field briefing, intelligence maps, or planning workspace content.
 */
export async function openStartMissionForActor(
  engagementId: string,
  userId: string,
): Promise<OpenStartMissionResult> {
  const engagement = await loadEngagementForPortalActor(engagementId, userId, {
    includeArchived: true,
  });
  if (!engagement) {
    return { ok: false, error: "Not found", status: 404 };
  }
  if (String(engagement.archived_at ?? "").trim()) {
    return { ok: false, error: "Engagement is archived", status: 409 };
  }

  const status = String(engagement.status ?? "planned").toLowerCase();
  if (status === "completed" || status === "cancelled") {
    return { ok: false, error: "This engagement is closed.", status: 409 };
  }

  const now = new Date().toISOString();
  const existingSession = readStartMissionSnapshot(engagement.debrief_intelligence_snapshot);
  const hadSession = Boolean(existingSession?.opened_at);

  const patch: Record<string, unknown> = {
    updated_at: now,
    debrief_intelligence_snapshot: mergeStartMissionSnapshot(engagement.debrief_intelligence_snapshot, {
      opened_at: existingSession?.opened_at ?? now,
      live_notes: existingSession?.live_notes ?? "",
    }),
  };

  const { data: updated, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update(patch)
    .eq("id", engagementId)
    .select("*")
    .single();

  if (error || !updated) {
    return { ok: false, error: error?.message || "Could not open live mission", status: 500 };
  }

  const loaded = await loadStartMissionViewForActor(engagementId, userId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error, status: loaded.status };
  }

  return {
    ok: true,
    live: loaded.live,
    session_opened: !hadSession,
    opened_at: now,
  };
}
