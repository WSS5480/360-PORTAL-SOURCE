import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";

export type CompleteEngagementCallResult =
  | { ok: true }
  | { ok: false; error: string; status: 404 | 409 | 500 };

/**
 * Ends the active engagement — moves to completed so debrief can open.
 */
export async function completeEngagementCallForActor(
  engagementId: string,
  userId: string,
): Promise<CompleteEngagementCallResult> {
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
  if (status === "cancelled") {
    return { ok: false, error: "This engagement is cancelled.", status: 409 };
  }
  if (status === "completed") {
    return { ok: true };
  }
  if (status !== "in_progress") {
    return { ok: false, error: "Start the call before completing it.", status: 409 };
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({ status: "completed", updated_at: now })
    .eq("id", engagementId);

  if (error) {
    return { ok: false, error: error.message || "Could not complete call", status: 500 };
  }

  return { ok: true };
}
