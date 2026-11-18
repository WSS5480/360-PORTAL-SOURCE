import { isIntroCallScheduledOnDirectoryRow } from "@/lib/surgical-sales/discoveryIntroCallActivity";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderIntroCallEngagementPreview } from "@/lib/surgical-sales/introCallEngagementLifecycle";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

const INTRO_CALL_TYPES = new Set(["intro_call", "follow_up", "reactivation"]);

export function resolveProviderIntroCallEngagementPreview(
  provider: ProviderDirectoryRow,
): ProviderIntroCallEngagementPreview | null {
  if (!isIntroCallScheduledOnDirectoryRow(provider)) return null;

  const upcoming = provider.upcoming_engagement;
  if (!upcoming?.id) return null;

  const type = normalizeEngagementType(String(upcoming.engagement_type ?? ""));
  if (!INTRO_CALL_TYPES.has(type)) return null;

  return {
    id: String(upcoming.id),
    status: String(upcoming.status ?? "planned"),
    prepared_at: upcoming.prepared_at ?? null,
    planning_status: upcoming.planning_status ?? null,
  };
}
