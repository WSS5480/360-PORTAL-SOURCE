/**
 * Legacy discovery intelligence items → consolidated groups (Access / Clinical / Champion).
 * Preserves contact field values and validation metadata; does not delete user content.
 */

import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { OPPORTUNITY_INTELLIGENCE_SIGNALS } from "@/lib/surgical-sales/opportunityIntelligenceSignals";

/** Flat readiness row ids retired in favor of consolidated access signals. */
export const LEGACY_DISCOVERY_READINESS_SIGNAL_IDS = [
  "coordinator",
  "access_path",
  "credentialing",
  "sponsor",
  "facility_access_pathway",
  "vendor_approval_path",
  "credentialing_requirements",
  "observation_logistics_confirmed",
  "or_access_sponsor",
  "observation_pathway_approval",
] as const;

export type LegacyDiscoveryReadinessSignalId =
  (typeof LEGACY_DISCOVERY_READINESS_SIGNAL_IDS)[number];

export type CanonicalDiscoveryWorkflowSignalId =
  | "observation_approval_status"
  | "scheduling_owner"
  | "facility_vendor_pathway"
  | "observation_logistics"
  | "clinical_champion"
  | "decision_influence";

/** Canonical display labels for consolidated discovery signals. */
export const CANONICAL_DISCOVERY_SIGNAL_LABELS: Partial<
  Record<CanonicalDiscoveryWorkflowSignalId | DiscoveryStructuredSignalId, string>
> = {
  observation_approval: "Observation approval status",
  observation_approval_status: "Observation approval status",
  scheduling_owner: "Scheduling owner identified",
  facility_vendor_pathway: "Facility/vendor pathway understood",
  observation_logistics: "Observation logistics understood",
  workflow_visibility: "Procedure/workflow visibility",
  product_alignment: "Product alignment confidence",
  case_opportunity: "Case opportunity potential",
  clinical_champion: "Clinical champion identified",
  decision_influence: "Decision influence mapped",
};

/** Retired standalone labels → consolidated signal label (for UI + open-question dedupe). */
export const LEGACY_DISCOVERY_LABEL_ALIASES: Record<string, string> = {
  "Facility access pathway mapped":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.facility_vendor_pathway ?? "Facility/vendor pathway understood",
  "Vendor approval path documented":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.facility_vendor_pathway ?? "Facility/vendor pathway understood",
  "Vendor approval path captured":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.facility_vendor_pathway ?? "Facility/vendor pathway understood",
  "Credentialing requirements known":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.facility_vendor_pathway ?? "Facility/vendor pathway understood",
  "Credentialing path documented":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.facility_vendor_pathway ?? "Facility/vendor pathway understood",
  "Observation logistics confirmed":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.observation_logistics ?? "Observation logistics understood",
  "Observation logistics captured":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.observation_logistics ?? "Observation logistics understood",
  "OR access sponsor identified":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.clinical_champion ?? "Clinical champion identified",
  "Observation pathway approval pending":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.observation_approval_status ?? "Observation approval status",
  "Provider observation approval pending":
    CANONICAL_DISCOVERY_SIGNAL_LABELS.observation_approval_status ?? "Observation approval status",
  "Facility access pathway": "Facility/vendor pathway",
};

export const LEGACY_DISCOVERY_SIGNAL_TO_CANONICAL: Record<
  LegacyDiscoveryReadinessSignalId,
  CanonicalDiscoveryWorkflowSignalId | DiscoveryStructuredSignalId
> = {
  coordinator: "scheduling_owner",
  access_path: "facility_vendor_pathway",
  credentialing: "facility_vendor_pathway",
  facility_access_pathway: "facility_vendor_pathway",
  vendor_approval_path: "facility_vendor_pathway",
  credentialing_requirements: "facility_vendor_pathway",
  observation_logistics_confirmed: "observation_logistics",
  sponsor: "clinical_champion",
  or_access_sponsor: "clinical_champion",
  observation_pathway_approval: "observation_approval_status",
};

/** Provider planning / intelligence db keys owned by each consolidated discovery signal. */
export const DISCOVERY_SIGNAL_DB_KEYS = {
  observation_approval: ["provider_observation_feasibility", "provider_evaluation_openness"],
  scheduling_owner: ["provider_observation_coordinator_contact"],
  facility_vendor_pathway: [
    "provider_observation_access_path",
    "provider_observation_credentialing_needed",
    "provider_credentialing_status",
  ],
  observation_logistics: [
    "provider_observation_best_days_case_types",
    "provider_ideal_observation_cases",
  ],
  workflow_visibility: [
    "provider_procedure_focus",
    "provider_technique_preferences",
    "provider_workflow_pain_points",
  ],
  product_alignment: ["provider_competitive_products", "provider_evaluation_openness"],
  case_opportunity: ["provider_case_volume_estimate", "provider_ideal_observation_cases"],
  clinical_champion: [
    "provider_champion_potential",
    "provider_or_team_dynamics",
    "influence_level",
  ],
  decision_influence: ["influence_level", "provider_decision_maker_status"],
  ...Object.fromEntries(
    OPPORTUNITY_INTELLIGENCE_SIGNALS.map((spec) => [spec.id, spec.dbKeys] as const),
  ),
} as unknown as Record<DiscoveryStructuredSignalId, readonly string[]>;

const STRUCTURED_DISCOVERY_DB_KEY_SET = new Set(
  Object.values(DISCOVERY_SIGNAL_DB_KEYS).flatMap((keys) => keys),
);

/** Legacy metadata keys that may have been stored under retired signal ids. */
const LEGACY_METADATA_KEY_TO_DB_KEY: Record<string, string> = {
  coordinator: "provider_observation_coordinator_contact",
  access_path: "provider_observation_access_path",
  credentialing: "provider_observation_credentialing_needed",
  vendor_approval_path: "provider_observation_credentialing_needed",
  facility_access_pathway: "provider_observation_access_path",
  credentialing_requirements: "provider_credentialing_status",
  observation_logistics_confirmed: "provider_observation_best_days_case_types",
  sponsor: "provider_champion_potential",
  or_access_sponsor: "provider_champion_potential",
  observation_pathway_approval: "provider_observation_feasibility",
};

export function normalizeLegacyDiscoveryWorkflowRowId(id: string): string {
  const mapped = LEGACY_DISCOVERY_SIGNAL_TO_CANONICAL[id as LegacyDiscoveryReadinessSignalId];
  if (!mapped) return id;
  return mapped === "observation_approval" ? "observation_approval_status" : mapped;
}

export function normalizeLegacyDiscoveryDisplayLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;
  if (LEGACY_DISCOVERY_LABEL_ALIASES[trimmed]) {
    return LEGACY_DISCOVERY_LABEL_ALIASES[trimmed]!;
  }
  for (const [legacy, canonical] of Object.entries(LEGACY_DISCOVERY_LABEL_ALIASES)) {
    if (trimmed.toLowerCase() === legacy.toLowerCase()) return canonical;
  }
  return trimmed;
}

export function canonicalDiscoverySignalLabel(
  signalId: CanonicalDiscoveryWorkflowSignalId | DiscoveryStructuredSignalId,
): string {
  return CANONICAL_DISCOVERY_SIGNAL_LABELS[signalId] ?? signalId;
}

export function isStructuredDiscoveryDbKey(dbKey: string): boolean {
  return STRUCTURED_DISCOVERY_DB_KEY_SET.has(dbKey);
}

export function migrateDiscoveryIntelligenceFieldMetadata(
  rawMetadata: unknown,
): ProviderIntelligenceFieldMetadataMap {
  if (!rawMetadata || typeof rawMetadata !== "object" || Array.isArray(rawMetadata)) {
    return {};
  }

  const raw = { ...(rawMetadata as Record<string, unknown>) };
  for (const [legacyKey, dbKey] of Object.entries(LEGACY_METADATA_KEY_TO_DB_KEY)) {
    const legacyMeta = raw[legacyKey];
    if (!legacyMeta || typeof legacyMeta !== "object") continue;
    const existing = raw[dbKey];
    if (!existing || (typeof existing === "object" && !Array.isArray(existing))) {
      raw[dbKey] = { ...(existing as Record<string, unknown>), ...(legacyMeta as Record<string, unknown>) };
    } else {
      raw[dbKey] = legacyMeta;
    }
    delete raw[legacyKey];
  }

  return parseProviderIntelligenceFieldMetadata(raw);
}

function mergeFieldIfEmpty(
  contact: Record<string, unknown>,
  targetKey: string,
  sourceKey: string,
): void {
  const target = String(contact[targetKey] ?? "").trim();
  const source = String(contact[sourceKey] ?? "").trim();
  if (target || !source) return;
  contact[targetKey] = contact[sourceKey];
}

/**
 * Non-destructive read-model hydration: metadata aliases + empty-field backfill only.
 */
export function hydrateDiscoveryContactFromLegacy(
  contact: Record<string, unknown>,
): Record<string, unknown> {
  const hydrated: Record<string, unknown> = { ...contact };

  if (contact.provider_intelligence_field_metadata != null) {
    hydrated.provider_intelligence_field_metadata = migrateDiscoveryIntelligenceFieldMetadata(
      contact.provider_intelligence_field_metadata,
    );
  }

  // Legacy OR sponsor notes sometimes landed on access path — keep on champion-related fields when empty.
  const accessPath = String(contact.provider_observation_access_path ?? "");
  const sponsorOnPath = /\b(sponsor|champion|internal ally|supports observation)\b/i.test(accessPath);
  if (sponsorOnPath && !fieldHasIntelligenceSignal("provider_champion_potential", contact.provider_champion_potential)) {
    mergeFieldIfEmpty(hydrated, "provider_champion_potential", "provider_observation_access_path");
  }

  mergeFieldIfEmpty(hydrated, "provider_champion_potential", "provider_or_team_dynamics");

  return hydrated;
}

export function legacyDiscoveryReadinessIdSet(): Set<string> {
  return new Set<string>(LEGACY_DISCOVERY_READINESS_SIGNAL_IDS);
}
