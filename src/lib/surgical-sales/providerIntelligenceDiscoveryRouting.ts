/**
 * Rapid / progressive discovery routing — operational observation access first;
 * vendor footprint and competitive mapping only in evaluation-stage workflows.
 */

import type { ProviderIntelligenceMaturityStage } from "@/lib/surgical-sales/providerIntelligenceMaturity";

/** Canonical early-discovery prompts for observation access (not incumbent footprint). */
export const OPERATIONAL_OBSERVATION_ACCESS_PROMPTS: Record<string, string> = {
  provider_observation_access_path: "How does observation access work here?",
  provider_observation_coordinator_contact: "Who coordinates observation scheduling?",
  provider_observation_credentialing_needed:
    "What needs to happen before a vendor can observe?",
  provider_observation_best_days_case_types:
    "How far in advance are observation requests usually handled?",
};

/** Vendor footprint / competitive mapping — evaluation and conversion only. */
export const VENDOR_FOOTPRINT_DISCOVERY_FIELD_KEYS = [
  "provider_current_vendors",
  "provider_competitive_products",
  "provider_dissatisfaction_areas",
  "provider_preference_card_signals",
] as const;

export type VendorFootprintDiscoveryFieldKey =
  (typeof VENDOR_FOOTPRINT_DISCOVERY_FIELD_KEYS)[number];

const MATURITY_RANK: Record<ProviderIntelligenceMaturityStage, number> = {
  early_discovery: 0,
  operationally_qualified: 1,
  observation_ready: 2,
  evaluation_active: 3,
  adoption_building: 4,
  strategic_account: 5,
};

export function isVendorFootprintDiscoveryField(dbKey: string): boolean {
  return (VENDOR_FOOTPRINT_DISCOVERY_FIELD_KEYS as readonly string[]).includes(dbKey);
}

export function isVendorFootprintDiscoveryVisibleForMaturityStage(
  dbKey: string,
  stage: ProviderIntelligenceMaturityStage,
): boolean {
  if (!isVendorFootprintDiscoveryField(dbKey)) {
    return true;
  }
  return MATURITY_RANK[stage] >= MATURITY_RANK.evaluation_active;
}

export function operationalObservationAccessPrompt(
  dbKey: string,
  fallback?: string,
): string | undefined {
  return OPERATIONAL_OBSERVATION_ACCESS_PROMPTS[dbKey] ?? fallback;
}
