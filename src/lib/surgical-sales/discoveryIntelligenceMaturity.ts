/**
 * Discovery intelligence maturity — user-facing Partial / Likely / Confirmed labels.
 */

import { DISCOVERY_FIELD_STATUS, type DiscoveryFieldStatusLabel } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

export type DiscoveryIntelligenceMaturity = "unknown" | "partial" | "likely" | "confirmed";

const F = DISCOVERY_FIELD_STATUS;

export function resolveDiscoveryIntelligenceMaturity(input: {
  statusLabel: DiscoveryFieldStatusLabel;
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  dbKeys: string[];
}): DiscoveryIntelligenceMaturity {
  const { statusLabel, fieldMeta, dbKeys } = input;

  if (statusLabel === F.unknown) return "unknown";
  if (statusLabel === F.blocked) return "partial";
  if (statusLabel === F.conditional) return "likely";
  if (statusLabel === F.notApplicable) return "confirmed";

  const meta = dbKeys.map((k) => fieldMeta[k]).find(Boolean);
  const lifecycle = meta?.lifecycle_state;
  if (statusLabel === F.validated || lifecycle === "validated" || meta?.validated_at) {
    return "confirmed";
  }
  if (lifecycle === "confirmed" || meta?.confirmed_at) {
    return "likely";
  }
  if (statusLabel === F.captured || lifecycle === "captured" || lifecycle === "assumed") {
    return "partial";
  }
  return "partial";
}

export function discoveryIntelligenceStatusDisplayLabel(input: {
  statusLabel: DiscoveryFieldStatusLabel;
  maturity: DiscoveryIntelligenceMaturity;
}): string {
  if (input.statusLabel === F.conditional) return "Conditional";
  return discoveryIntelligenceMaturityLabel(input.maturity);
}

export function discoveryIntelligenceMaturityLabel(maturity: DiscoveryIntelligenceMaturity): string {
  switch (maturity) {
    case "unknown":
      return "Unknown";
    case "partial":
      return "Partial";
    case "likely":
      return "Likely";
    case "confirmed":
      return "Confirmed";
    default:
      return "Unknown";
  }
}

export function discoveryMaturityStatusSlug(maturity: DiscoveryIntelligenceMaturity): string {
  switch (maturity) {
    case "confirmed":
      return "validated";
    case "likely":
      return "captured";
    case "partial":
      return "partial";
    default:
      return "unknown";
  }
}
