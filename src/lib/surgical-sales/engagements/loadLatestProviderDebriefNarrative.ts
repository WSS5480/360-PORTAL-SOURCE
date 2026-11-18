import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLatestEngagementDebriefNarrative } from "@/lib/surgical-sales/engagements/buildDebriefNarrativeIntelligenceHints";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export type ProviderDebriefNarrativeContext = {
  engagementId: string;
  narrative: string;
};

/**
 * Latest completed debrief narrative for a provider (any rep on the account).
 * Used to backfill intelligence dossier when the viewer's own engagement list is empty.
 */
export async function loadLatestProviderDebriefNarrativeForProfile(
  supabase: SupabaseClient,
  providerId: string,
): Promise<ProviderDebriefNarrativeContext | null> {
  const id = String(providerId ?? "").trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from("surgical_sales_engagements")
    .select("id, debrief_intelligence_snapshot, debrief_completed_at, updated_at")
    .eq("provider_id", id)
    .eq("debrief_completed", true)
    .order("debrief_completed_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("[loadLatestProviderDebriefNarrativeForProfile]", error.message);
    return null;
  }

  for (const row of data ?? []) {
    const engagement = row as ProviderEngagementSummary;
    const narrative = resolveLatestEngagementDebriefNarrative([engagement]);
    if (narrative) {
      return {
        engagementId: String(engagement.id ?? "").trim(),
        narrative,
      };
    }
  }

  return null;
}
