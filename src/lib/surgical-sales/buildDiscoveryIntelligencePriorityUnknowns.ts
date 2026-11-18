/**
 * Intelligence tab — top 2–3 progression blockers (summary lines, not duplicate group rows).
 */

import { discoveryPriorityUnknownSummary } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import {
  discoverySignalPriority,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { isDiscoveryAccessWorkflowComplete } from "@/lib/surgical-sales/providerOverviewDiscoveryNextMove";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { OPPORTUNITY_INTELLIGENCE_SIGNALS } from "@/lib/surgical-sales/opportunityIntelligenceSignals";

export type DiscoveryIntelligencePriorityUnknown = {
  signalId: DiscoveryStructuredSignalId;
  summary: string;
  primaryDbKey: string;
  sectionId?: ProviderIntelligenceSectionId;
};

/** Access readiness — only observation approval drives overview blockers. */
export const ACCESS_READINESS_SIGNAL_IDS: DiscoveryStructuredSignalId[] = ["observation_approval"];

/** Optional access intel — informational in Access Intelligence section only. */
export const OPTIONAL_ACCESS_READINESS_SIGNAL_IDS: DiscoveryStructuredSignalId[] = [
  "scheduling_owner",
  "facility_vendor_pathway",
  "observation_logistics",
];

/** Gate-first order — access signals first; sales/opportunity intel only after access is secured. */
const PROGRESSION_SIGNAL_ORDER: DiscoveryStructuredSignalId[] = [
  ...ACCESS_READINESS_SIGNAL_IDS,
  "workflow_visibility",
  "product_alignment",
  "clinical_champion",
];

function progressionSignalOrderForContact(
  contact: Record<string, unknown>,
): DiscoveryStructuredSignalId[] {
  if (!isDiscoveryAccessWorkflowComplete(contact)) {
    return ["observation_approval"];
  }
  return [...PROGRESSION_SIGNAL_ORDER.filter((id) => !OPTIONAL_ACCESS_READINESS_SIGNAL_IDS.includes(id))];
}

const SIGNAL_CAPTURE: Record<
  DiscoveryStructuredSignalId,
  { primaryDbKey: string; sectionId?: ProviderIntelligenceSectionId }
> = {
  observation_approval: {
    primaryDbKey: "provider_observation_feasibility",
    sectionId: "observation_readiness",
  },
  scheduling_owner: {
    primaryDbKey: "provider_observation_coordinator_contact",
    sectionId: "observation_readiness",
  },
  facility_vendor_pathway: {
    primaryDbKey: "provider_observation_access_path",
    sectionId: "observation_readiness",
  },
  observation_logistics: {
    primaryDbKey: "provider_observation_best_days_case_types",
    sectionId: "observation_readiness",
  },
  workflow_visibility: {
    primaryDbKey: "provider_procedure_focus",
    sectionId: "clinical_workflow",
  },
  product_alignment: {
    primaryDbKey: "provider_competitive_products",
    sectionId: "commercial_signals",
  },
  case_opportunity: {
    primaryDbKey: "provider_case_volume_estimate",
    sectionId: "clinical_workflow",
  },
  clinical_champion: {
    primaryDbKey: "provider_champion_potential",
    sectionId: "relationship_intelligence",
  },
  decision_influence: {
    primaryDbKey: "influence_level",
    sectionId: "relationship_intelligence",
  },
  ...Object.fromEntries(
    OPPORTUNITY_INTELLIGENCE_SIGNALS.map((spec) => [
      spec.id,
      { primaryDbKey: spec.dbKey, sectionId: "commercial_signals" as const },
    ]),
  ) as Record<
    (typeof OPPORTUNITY_INTELLIGENCE_SIGNALS)[number]["id"],
    { primaryDbKey: string; sectionId: ProviderIntelligenceSectionId }
  >,
};

/** Highest-priority unresolved access readiness signal — overview current focus source. */
export function resolveDiscoveryAccessReadinessFocus(input: {
  contact: Record<string, unknown>;
}): DiscoveryIntelligencePriorityUnknown | null {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);

  for (const signalId of ["observation_approval"] as const) {
    const status = resolveDiscoveryStructuredSignalStatus(signalId, contact);
    const summary = discoveryPriorityUnknownSummary(signalId, status);
    if (!summary) continue;

    const capture = SIGNAL_CAPTURE[signalId];
    return {
      signalId,
      summary,
      primaryDbKey: capture.primaryDbKey,
      sectionId: capture.sectionId,
    };
  }

  return null;
}

export function buildDiscoveryIntelligencePriorityUnknowns(input: {
  contact: Record<string, unknown>;
  max?: number;
}): DiscoveryIntelligencePriorityUnknown[] {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const max = Math.min(Math.max(input.max ?? 3, 1), 3);
  const items: DiscoveryIntelligencePriorityUnknown[] = [];

  const ordered = [...progressionSignalOrderForContact(contact)].sort(
    (a, b) => discoverySignalPriority(a) - discoverySignalPriority(b),
  );

  for (const signalId of ordered) {
    if (items.length >= max) break;

    const status = resolveDiscoveryStructuredSignalStatus(signalId, contact);
    const summary = discoveryPriorityUnknownSummary(signalId, status);
    if (!summary) continue;

    const capture = SIGNAL_CAPTURE[signalId];
    items.push({
      signalId,
      summary,
      primaryDbKey: capture.primaryDbKey,
      sectionId: capture.sectionId,
    });
  }

  return items;
}
