/**
 * Discovery Mapping — operational, sales, and opportunity intelligence taxonomy.
 *
 * Operational intelligence supports access (scheduling, credentialing, approval).
 * Sales intelligence supports revenue (champion, fit sizing, workflow maturity).
 * Product fit intelligence captures future product opportunities.
 */

import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  isOpportunityIntelligenceSignalId,
  OPPORTUNITY_INTELLIGENCE_SIGNAL_ORDER,
} from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";

export type DiscoveryMappingIntelligenceCategory = "opportunity" | "operational" | "sales";

export const DISCOVERY_MAPPING_INTELLIGENCE_CATEGORY_UI: Record<
  DiscoveryMappingIntelligenceCategory,
  {
    title: string;
    subtitle: string;
    purpose: string;
    examples: string[];
  }
> = {
  opportunity: {
    title: "Observation intelligence",
    subtitle: "Informational until observation",
    purpose:
      "Capture products in use, competitors, workflow bottlenecks, clinical and staff frustrations, and product signals — informational until an observation occurs.",
    examples: [
      "Products currently used",
      "Competitor products",
      "Workflow bottlenecks",
      "Clinical frustrations",
      "Staff frustrations",
      "Product signals",
    ],
  },
  operational: {
    title: "Access pathway",
    subtitle: "Required before observation",
    purpose:
      "Map what blocks or unlocks observation access — provider approval, scheduling ownership, observation date, vendor credentialing, and facility access requirements.",
    examples: [
      "Provider approval",
      "Scheduling ownership",
      "Observation date",
      "Vendor credentialing",
      "Facility access requirements",
    ],
  },
  sales: {
    title: "Product fit development",
    subtitle: "After observation",
    purpose:
      "Develop the commercial case after observation — product fit, growth opportunity, champion identification, and next-step recommendations.",
    examples: [
      "Product fit",
      "Growth opportunity",
      "Champion identification",
      "Next step recommendations",
    ],
  },
};

const OPERATIONAL_SIGNALS = new Set<DiscoveryStructuredSignalId>([
  "observation_approval",
  "scheduling_owner",
  "facility_vendor_pathway",
  "observation_logistics",
]);

const SALES_SIGNALS = new Set<DiscoveryStructuredSignalId>([
  "workflow_visibility",
  "product_alignment",
  "case_opportunity",
  "clinical_champion",
  "decision_influence",
]);

export function discoveryMappingIntelligenceCategory(
  signalId: DiscoveryStructuredSignalId | StageMappingSignalId,
): DiscoveryMappingIntelligenceCategory {
  if (isOpportunityIntelligenceSignalId(signalId)) {
    return "opportunity";
  }
  if (OPERATIONAL_SIGNALS.has(signalId as DiscoveryStructuredSignalId)) {
    return "operational";
  }
  if (SALES_SIGNALS.has(signalId as DiscoveryStructuredSignalId)) {
    return "sales";
  }
  return "sales";
}

export function isOpportunityMappingSignal(
  signalId: DiscoveryStructuredSignalId | StageMappingSignalId,
): boolean {
  return discoveryMappingIntelligenceCategory(signalId) === "opportunity";
}

export function isOperationalMappingSignal(
  signalId: DiscoveryStructuredSignalId | StageMappingSignalId,
): boolean {
  return discoveryMappingIntelligenceCategory(signalId) === "operational";
}

export function isSalesMappingSignal(
  signalId: DiscoveryStructuredSignalId | StageMappingSignalId,
): boolean {
  return discoveryMappingIntelligenceCategory(signalId) === "sales";
}

/** Default category order before stage-aware reordering in the mapping modal. */
export const DISCOVERY_MAPPING_INTELLIGENCE_CATEGORY_ORDER: DiscoveryMappingIntelligenceCategory[] =
  ["operational", "sales", "opportunity"];

export const OPPORTUNITY_MAPPING_SIGNAL_ORDER = OPPORTUNITY_INTELLIGENCE_SIGNAL_ORDER;
