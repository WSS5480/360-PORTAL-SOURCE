/**
 * Provider overview → Discovery Mapping navigation (read-only overview, edit in mapping).
 */

import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import {
  DISCOVERY_FIELD_STATUS,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { FACILITY_CREDENTIALING_FIELD_KEYS } from "@/lib/surgical-sales/facilityCredentialingFields";
import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { resolveDiscoveryAccessReadinessFocus } from "@/lib/surgical-sales/buildDiscoveryIntelligencePriorityUnknowns";
import {
  DISCOVERY_MAPPING_ACCESS_SIGNAL_ORDER,
  DISCOVERY_MAPPING_OBSERVATION_INTEL_SIGNAL_ORDER,
  DISCOVERY_MAPPING_OPPORTUNITY_DEV_SIGNAL_ORDER,
} from "@/lib/surgical-sales/discoveryMappingFocusStage";
import {
  isCredentialingWorkflowComplete,
  isObservationAccessConditionallyAllowed,
  OBSERVATION_CREDENTIALING_NEEDED_DB_KEY,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import { isDiscoveryAccessWorkflowComplete } from "@/lib/surgical-sales/providerOverviewDiscoveryNextMove";
import { SCHEDULING_OWNER_FIELD_DB_KEYS } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";

const SIGNAL_TO_GROUP: Record<DiscoveryStructuredSignalId, DiscoveryIntelligenceGroupId> = {
  observation_approval: "access_readiness",
  scheduling_owner: "access_readiness",
  facility_vendor_pathway: "access_readiness",
  observation_logistics: "access_readiness",
  workflow_visibility: "clinical_fit",
  product_alignment: "clinical_fit",
  case_opportunity: "clinical_fit",
  clinical_champion: "champion_landscape",
  decision_influence: "champion_landscape",
  opportunity_clinical_frustrations: "opportunity_intelligence",
  opportunity_workflow_inefficiencies: "opportunity_intelligence",
  opportunity_products_in_use: "opportunity_intelligence",
  opportunity_product_gaps: "opportunity_intelligence",
  opportunity_outcome_priorities: "opportunity_intelligence",
  opportunity_staff_frustrations: "opportunity_intelligence",
  opportunity_future_signals: "opportunity_intelligence",
};

const CREDENTIALING_DB_KEYS = new Set<string>([
  OBSERVATION_CREDENTIALING_NEEDED_DB_KEY,
  "provider_credentialing_status",
  ...Object.values(FACILITY_CREDENTIALING_FIELD_KEYS),
]);

const DB_KEY_TO_SIGNAL: Record<string, DiscoveryStructuredSignalId> = {
  provider_observation_feasibility: "observation_approval",
  provider_evaluation_openness: "observation_approval",
  provider_observation_access_path: "facility_vendor_pathway",
  provider_observation_best_days_case_types: "observation_logistics",
  provider_workflow_understanding: "workflow_visibility",
  provider_procedure_focus: "workflow_visibility",
  provider_technique_preferences: "workflow_visibility",
  provider_workflow_pain_points: "workflow_visibility",
  provider_product_fit_signals: "product_alignment",
  provider_case_opportunity_signals: "case_opportunity",
  provider_champion_potential: "clinical_champion",
  influence_level: "decision_influence",
};

for (const key of SCHEDULING_OWNER_FIELD_DB_KEYS) {
  DB_KEY_TO_SIGNAL[key] = "scheduling_owner";
}

for (const key of Object.values(FACILITY_CREDENTIALING_FIELD_KEYS)) {
  DB_KEY_TO_SIGNAL[key] = "facility_vendor_pathway";
}
DB_KEY_TO_SIGNAL[OBSERVATION_CREDENTIALING_NEEDED_DB_KEY] = "facility_vendor_pathway";
DB_KEY_TO_SIGNAL.provider_credentialing_status = "facility_vendor_pathway";

export function discoveryGroupIdForSignal(
  signalId: DiscoveryStructuredSignalId,
): DiscoveryIntelligenceGroupId {
  return SIGNAL_TO_GROUP[signalId] ?? "access_readiness";
}

export function discoverySignalIdForDbKey(dbKey: string): DiscoveryStructuredSignalId | null {
  return DB_KEY_TO_SIGNAL[dbKey] ?? null;
}

export function appendProviderDiscoveryMappingParams(
  intelligenceHref: string,
  input?: {
    signalId?: DiscoveryStructuredSignalId | null;
    groupId?: DiscoveryIntelligenceGroupId | null;
    openMapping?: boolean;
  },
): string {
  const base = intelligenceHref.trim() || "/";
  let url: URL;
  try {
    url = base.startsWith("/")
      ? new URL(base, "https://portal.local")
      : new URL(base);
  } catch {
    return base;
  }

  if (input?.openMapping !== false) {
    url.searchParams.set("mapping", "1");
  }

  const signalId = input?.signalId ?? null;
  const groupId =
    input?.groupId ?? (signalId ? discoveryGroupIdForSignal(signalId) : null);

  if (signalId) {
    url.searchParams.set("signal", signalId);
  }
  if (groupId) {
    url.searchParams.set("focus", groupId);
  }

  return `${url.pathname}${url.search}`;
}

export function buildProviderDiscoveryMappingHref(input: {
  providerId: string;
  signalId?: DiscoveryStructuredSignalId | null;
  groupId?: DiscoveryIntelligenceGroupId | null;
  openMapping?: boolean;
}): string {
  const intelligenceHref = `/portal/sales/providers/${encodeURIComponent(input.providerId)}?tab=intelligence`;
  return appendProviderDiscoveryMappingParams(intelligenceHref, {
    signalId: input.signalId,
    groupId: input.groupId,
    openMapping: input.openMapping,
  });
}

function firstUnresolvedAccessSignal(
  contact: Record<string, unknown>,
): DiscoveryStructuredSignalId | null {
  for (const signalId of DISCOVERY_MAPPING_ACCESS_SIGNAL_ORDER) {
    const status = resolveDiscoveryStructuredSignalStatus(signalId, contact);
    if (status === DISCOVERY_FIELD_STATUS.unknown) {
      return signalId;
    }
  }
  return null;
}

function firstUnresolvedObservationIntelSignal(
  contact: Record<string, unknown>,
): DiscoveryStructuredSignalId | null {
  for (const signalId of DISCOVERY_MAPPING_OBSERVATION_INTEL_SIGNAL_ORDER) {
    const status = resolveDiscoveryStructuredSignalStatus(signalId, contact);
    if (status === DISCOVERY_FIELD_STATUS.unknown) {
      return signalId;
    }
  }
  return null;
}

function firstUnresolvedOpportunityDevSignal(
  contact: Record<string, unknown>,
): DiscoveryStructuredSignalId | null {
  for (const signalId of DISCOVERY_MAPPING_OPPORTUNITY_DEV_SIGNAL_ORDER) {
    const status = resolveDiscoveryStructuredSignalStatus(signalId, contact);
    if (status === DISCOVERY_FIELD_STATUS.unknown) {
      return signalId;
    }
  }
  return null;
}

function hasObservationEvidenceOnContact(contact: Record<string, unknown>): boolean {
  const history = String(contact.observation_history ?? "").trim();
  if (history) return true;
  const stage = String(contact.provider_relationship_stage ?? "").trim().toLowerCase();
  return stage === "observation_completed" || stage === "evaluation_active";
}

/**
 * Highest-priority discovery signal for “Continue discovery” / overview CTAs.
 * Always routes to the highest-priority unresolved access dependency first.
 */
export function resolveContinueDiscoveryMappingSignal(
  contact: Record<string, unknown>,
): DiscoveryStructuredSignalId {
  if (!isDiscoveryAccessWorkflowComplete(contact)) {
    if (
      isObservationAccessConditionallyAllowed(contact) &&
      !isCredentialingWorkflowComplete(contact)
    ) {
      return "facility_vendor_pathway";
    }

    const focus = resolveDiscoveryAccessReadinessFocus({ contact });
    if (focus?.primaryDbKey) {
      return discoverySignalIdForDbKey(focus.primaryDbKey) ?? "observation_approval";
    }

    return firstUnresolvedAccessSignal(contact) ?? "observation_approval";
  }

  if (hasObservationEvidenceOnContact(contact)) {
    return (
      firstUnresolvedOpportunityDevSignal(contact) ??
      firstUnresolvedObservationIntelSignal(contact) ??
      "product_alignment"
    );
  }

  return (
    firstUnresolvedObservationIntelSignal(contact) ??
    firstUnresolvedOpportunityDevSignal(contact) ??
    "opportunity_products_in_use"
  );
}

export function resolveDiscoveryMappingTargetForDbKey(dbKey: string): {
  signalId: DiscoveryStructuredSignalId;
  sectionId: ProviderIntelligenceSectionId;
} {
  const signalId = discoverySignalIdForDbKey(dbKey) ?? "observation_approval";
  return {
    signalId,
    sectionId: intelligenceSectionIdForDbKey(dbKey) ?? "observation_readiness",
  };
}

export function isCredentialingDbKey(dbKey: string): boolean {
  return CREDENTIALING_DB_KEYS.has(dbKey);
}

