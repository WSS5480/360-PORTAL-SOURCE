/**
 * Post-debrief handoff into Discovery Mapping.
 */

import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { discoverySignalIdForDbKey } from "@/lib/surgical-sales/providerDiscoveryMappingNavigation";
import { buildProviderDiscoveryMappingHref } from "@/lib/surgical-sales/providerDiscoveryMappingNavigation";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

const MAPPING_SIGNAL_PRIORITY: DiscoveryStructuredSignalId[] = [
  "scheduling_owner",
  "observation_approval",
  "facility_vendor_pathway",
  "clinical_champion",
  "decision_influence",
  "observation_logistics",
  "workflow_visibility",
  "product_alignment",
  "case_opportunity",
];

export type DebriefMappingHandoff = {
  updateCount: number;
  firstSignalId: DiscoveryStructuredSignalId | null;
  reviewMappingHref: string | null;
  toastMessage: string;
};

export function buildDebriefMappingHandoff(input: {
  providerId?: string | null;
  logUpdate?: LogUpdateParseResult | null;
}): DebriefMappingHandoff | null {
  const providerId = String(input.providerId ?? "").trim();
  const accepted = (input.logUpdate?.fieldUpdates ?? []).filter((field) => field.accepted);
  if (!providerId || accepted.length === 0) return null;

  const signalIds = new Set<DiscoveryStructuredSignalId>();
  for (const field of accepted) {
    const signalId = discoverySignalIdForDbKey(field.dbKey);
    if (signalId) signalIds.add(signalId);
  }

  const firstSignalId =
    MAPPING_SIGNAL_PRIORITY.find((signalId) => signalIds.has(signalId)) ?? null;

  return {
    updateCount: accepted.length,
    firstSignalId,
    reviewMappingHref: buildProviderDiscoveryMappingHref({
      providerId,
      signalId: firstSignalId,
      openMapping: true,
    }),
    toastMessage: `Intelligence applied: ${accepted.length} update${accepted.length === 1 ? "" : "s"} added.`,
  };
}
