import { ADMIN_INTEL_STALE_DAYS } from "@/lib/surgical-sales/admin/adminTeamDashboardTypes";
import {
  buildAdminProviderIntelligenceSummary,
  providerIntelligenceHasSignals,
} from "@/lib/surgical-sales/admin/buildAdminProviderIntelligenceSummary";

export function isProviderIntelligenceStale(input: {
  now: Date;
  caseCount: number;
  lastCapturedAt: string | null;
  staleDays?: number;
}): boolean {
  if (input.caseCount <= 0) return false;
  const staleDays = input.staleDays ?? ADMIN_INTEL_STALE_DAYS;
  const cutoff = new Date(input.now.getTime() - staleDays * 86_400_000);
  if (!input.lastCapturedAt) return true;
  return new Date(input.lastCapturedAt) < cutoff;
}

export function countStaleProvidersByRep(
  providers: Array<{ rep_user_id: string | null; is_stale: boolean }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const provider of providers) {
    if (!provider.is_stale || !provider.rep_user_id) continue;
    const repId = provider.rep_user_id;
    counts.set(repId, (counts.get(repId) ?? 0) + 1);
  }
  return counts;
}

export { providerIntelligenceHasSignals, buildAdminProviderIntelligenceSummary };
