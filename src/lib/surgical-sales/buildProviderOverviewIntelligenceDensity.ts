/**
 * Progressive intelligence — how much the overview should synthesize vs stay lightweight.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type ProviderOverviewIntelligenceDensity = "sparse" | "developing" | "grounded";

function countIntelligenceSignals(contact: Record<string, unknown>): number {
  const keys = [
    ...ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey),
    ...PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey),
  ];
  return keys.filter((dbKey) => fieldHasIntelligenceSignal(dbKey, String(contact[dbKey] ?? ""))).length;
}

export function resolveProviderOverviewIntelligenceDensity(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  planning?: ProviderPlanningCompletion | null;
}): ProviderOverviewIntelligenceDensity {
  const engagements = input.engagements ?? [];
  const completedEngagements = engagements.filter(
    (e) => String(e.status || "").toLowerCase() === "completed",
  ).length;
  const hasCases = (input.cases?.length ?? 0) > 0;
  const signalCount = countIntelligenceSignals(input.contact);
  const planningPct = input.planning?.percent ?? 0;

  if (hasCases || completedEngagements >= 2 || signalCount >= 8 || planningPct >= 45) {
    return "grounded";
  }

  if (completedEngagements >= 1 || signalCount >= 3 || planningPct >= 18) {
    return "developing";
  }

  return "sparse";
}

export function overviewScopeBulletLimit(density: ProviderOverviewIntelligenceDensity): number {
  switch (density) {
    case "sparse":
      return 3;
    case "developing":
      return 4;
    default:
      return 6;
  }
}
