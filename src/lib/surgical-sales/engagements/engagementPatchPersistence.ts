import { supabaseAdmin } from "@/lib/supabase/admin";

function isMissingTacticalAsksColumn(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("prepare_tactical_asks") && (m.includes("column") || m.includes("schema"));
}

/** Applies engagement patch; retries without prepare_tactical_asks if migration not applied yet. */
export async function updateEngagementPatch(
  engagementId: string,
  patch: Record<string, unknown>,
): Promise<
  | { ok: true; tacticalAsksSkipped?: boolean }
  | { ok: false; error: string; tacticalAsksSkipped?: boolean }
> {
  const payload = { ...patch, updated_at: new Date().toISOString() };

  const attempt = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update(payload)
    .eq("id", engagementId)
    .select("id")
    .maybeSingle();

  if (!attempt.error && attempt.data) {
    return { ok: true };
  }

  const message = String(attempt.error?.message ?? "Update failed");
  if (!("prepare_tactical_asks" in patch) || !isMissingTacticalAsksColumn(message)) {
    return { ok: false, error: message };
  }

  const retryPayload: Record<string, unknown> = { ...patch, updated_at: payload.updated_at };
  delete retryPayload.prepare_tactical_asks;
  const withoutTacticalAsks = retryPayload;
  const retry = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update(withoutTacticalAsks)
    .eq("id", engagementId)
    .select("id")
    .maybeSingle();

  if (!retry.error && retry.data) {
    return { ok: true, tacticalAsksSkipped: true };
  }

  return { ok: false, error: String(retry.error?.message ?? message) };
}
