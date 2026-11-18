import { buildObservationBriefingEffectiveContent } from "@/lib/surgical-sales/observationBriefingDefaults";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export const OBSERVATION_POTENTIAL_OPPORTUNITY_EMPTY =
  "Brief summary will appear here from discovery intelligence.";

export function buildObservationPotentialOpportunitySummary(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  planning?: ProviderPlanningCompletion | null;
  procedureLabel?: string | null;
}): string {
  const effective = buildObservationBriefingEffectiveContent(input);
  const items = effective.opportunityHypotheses.filter(Boolean);

  if (items.length === 0) return OBSERVATION_POTENTIAL_OPPORTUNITY_EMPTY;
  if (items.length === 1) return items[0]!;

  return items.slice(0, 2).join(" ");
}
