/**
 * Discovery Mapping — field-sales workflow stages.
 *
 * Stage 1 (Access Pathway): secure observation access before anything else.
 * Stage 2 (Observation Intelligence): capture OR intel — informational until observation.
 * Stage 3 (Opportunity Development): product fit, growth, champion after observation.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { countObservedProcedures } from "@/lib/surgical-sales/pathwayStageGates";
import {
  isOpportunityIntelligenceSignalId,
  OPPORTUNITY_INTELLIGENCE_SIGNAL_ORDER,
} from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import {
  discoveryMappingIntelligenceCategory,
  type DiscoveryMappingIntelligenceCategory,
} from "@/lib/surgical-sales/discoveryMappingIntelligenceCategory";
import { isDiscoveryAccessWorkflowComplete } from "@/lib/surgical-sales/providerOverviewDiscoveryNextMove";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import type {
  StageMappingOpenBucket,
  StageMappingVisibilityBucket,
} from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import { stageMappingOpenBucketSortKey } from "@/lib/surgical-sales/stageMappingQuestionRegistry";

export type DiscoveryMappingFocusStageId =
  | "access_pathway"
  | "observation_intelligence"
  | "opportunity_development";

export type DiscoveryMappingFocusStageContext = {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  pathwayStageId?: SalesPathwayStageId;
};

export const DISCOVERY_MAPPING_FOCUS_STAGE_UI: Record<
  DiscoveryMappingFocusStageId,
  {
    label: string;
    headline: string;
    guidance: string;
    primaryCategories: DiscoveryMappingIntelligenceCategory[];
    planningItems?: string[];
  }
> = {
  access_pathway: {
    label: "Stage 1 — Access Pathway",
    headline: "Secure observation access first",
    guidance:
      "Map provider approval, scheduling ownership, observation date, vendor credentialing, and facility access when you learn them. These are background reference — field execution (notes, observation, debrief) comes first.",
    primaryCategories: ["operational"],
  },
  observation_intelligence: {
    label: "Stage 2 — Observation Intelligence",
    headline: "Capture what to learn in the OR",
    guidance:
      "Log products in use, competitors, workflow bottlenecks, and clinical or staff frustrations when mentioned. These stay informational until an observation occurs — opportunity development unlocks after the case.",
    primaryCategories: ["opportunity"],
    planningItems: [
      "Observation Objective",
      "Signals To Watch",
      "Learning Questions",
      "Product Fit Hypotheses",
    ],
  },
  opportunity_development: {
    label: "Stage 3 — Opportunity Development",
    headline: "Develop the commercial opportunity",
    guidance:
      "Use observation evidence to validate product fit, growth opportunity, champion identification, and next-step recommendations.",
    primaryCategories: ["sales"],
  },
};

/** Access-pathway signals in field-sales priority order. */
export const DISCOVERY_MAPPING_ACCESS_SIGNAL_ORDER: StageMappingSignalId[] = [
  "observation_approval",
  "scheduling_owner",
  "facility_vendor_pathway",
  "observation_logistics",
];

/** Observation-intelligence signals (informational until observation). */
export const DISCOVERY_MAPPING_OBSERVATION_INTEL_SIGNAL_ORDER: StageMappingSignalId[] = [
  ...OPPORTUNITY_INTELLIGENCE_SIGNAL_ORDER,
];

/** Opportunity-development signals after observation. */
export const DISCOVERY_MAPPING_OPPORTUNITY_DEV_SIGNAL_ORDER: StageMappingSignalId[] = [
  "product_alignment",
  "case_opportunity",
  "clinical_champion",
  "workflow_visibility",
];

const OPEN_BUCKET_ORDER: StageMappingOpenBucket[] = [
  "required_now",
  "helpful_next",
  "later_stage",
];

const ACCESS_SIGNALS = new Set<StageMappingSignalId>(DISCOVERY_MAPPING_ACCESS_SIGNAL_ORDER);

const OPPORTUNITY_DEV_SIGNALS = new Set<StageMappingSignalId>(
  DISCOVERY_MAPPING_OPPORTUNITY_DEV_SIGNAL_ORDER,
);

function demoteOpenBucket(
  bucket: StageMappingOpenBucket,
  steps = 1,
): StageMappingOpenBucket {
  const index = OPEN_BUCKET_ORDER.indexOf(bucket);
  return OPEN_BUCKET_ORDER[Math.min(OPEN_BUCKET_ORDER.length - 1, index + steps)]!;
}

function promoteOpenBucket(
  bucket: StageMappingOpenBucket,
  steps = 1,
): StageMappingOpenBucket {
  const index = OPEN_BUCKET_ORDER.indexOf(bucket);
  return OPEN_BUCKET_ORDER[Math.max(0, index - steps)]!;
}

function capOpenBucketAt(
  bucket: StageMappingOpenBucket,
  max: StageMappingOpenBucket,
): StageMappingOpenBucket {
  return stageMappingOpenBucketSortKey(bucket) < stageMappingOpenBucketSortKey(max)
    ? max
    : bucket;
}

function asOpenBucket(bucket: StageMappingVisibilityBucket): StageMappingOpenBucket | null {
  if (bucket === "required_now" || bucket === "helpful_next" || bucket === "later_stage") {
    return bucket;
  }
  return null;
}


function hasCompletedObservation(input: DiscoveryMappingFocusStageContext): boolean {
  return (
    countObservedProcedures({
      contact: input.contact,
      engagements: input.engagements,
      cases: input.cases,
    }) >= 1
  );
}

/** Resolve the current Discovery Mapping workflow stage from provider context. */
export function resolveDiscoveryMappingFocusStage(
  input: DiscoveryMappingFocusStageContext,
): DiscoveryMappingFocusStageId {
  if (hasCompletedObservation(input)) {
    return "opportunity_development";
  }

  if (isDiscoveryAccessWorkflowComplete(input.contact)) {
    return "observation_intelligence";
  }

  return "access_pathway";
}

/** Category display order for the mapping modal at this workflow stage. */
export function discoveryMappingCategoryOrderForFocusStage(
  focusStage: DiscoveryMappingFocusStageId,
): DiscoveryMappingIntelligenceCategory[] {
  switch (focusStage) {
    case "access_pathway":
      return ["operational", "opportunity", "sales"];
    case "observation_intelligence":
      return ["opportunity", "operational", "sales"];
    case "opportunity_development":
      return ["sales", "opportunity", "operational"];
    default:
      return ["operational", "opportunity", "sales"];
  }
}

/** Whether a category should render expanded (primary) vs collapsed (secondary). */
export function isDiscoveryMappingPrimaryCategory(
  focusStage: DiscoveryMappingFocusStageId,
  category: DiscoveryMappingIntelligenceCategory,
): boolean {
  return DISCOVERY_MAPPING_FOCUS_STAGE_UI[focusStage].primaryCategories.includes(category);
}

function isObservationIntelSignal(signalId: StageMappingSignalId): boolean {
  return isOpportunityIntelligenceSignalId(signalId);
}

/**
 * Adjust pathway-derived visibility buckets to match workflow-stage priorities.
 */
export function applyDiscoveryMappingFocusStageBucket(input: {
  focusStage: DiscoveryMappingFocusStageId;
  signalId: StageMappingSignalId;
  baseBucket: StageMappingVisibilityBucket;
}): StageMappingVisibilityBucket {
  const { focusStage, signalId, baseBucket } = input;
  if (baseBucket === "confirmed" || baseBucket === "hidden") {
    return baseBucket;
  }

  const openBucket = asOpenBucket(baseBucket);
  if (!openBucket) return baseBucket;

  const category = discoveryMappingIntelligenceCategory(signalId);

  switch (focusStage) {
    case "access_pathway": {
      if (ACCESS_SIGNALS.has(signalId)) {
        return openBucket;
      }
      if (isObservationIntelSignal(signalId) || category === "opportunity") {
        return demoteOpenBucket(openBucket, openBucket === "required_now" ? 2 : 1);
      }
      if (OPPORTUNITY_DEV_SIGNALS.has(signalId) || category === "sales") {
        return "later_stage";
      }
      return openBucket;
    }
    case "observation_intelligence": {
      if (isObservationIntelSignal(signalId)) {
        return capOpenBucketAt(openBucket, "helpful_next");
      }
      if (ACCESS_SIGNALS.has(signalId)) {
        return demoteOpenBucket(openBucket, openBucket === "required_now" ? 1 : 0);
      }
      if (OPPORTUNITY_DEV_SIGNALS.has(signalId) || category === "sales") {
        return "later_stage";
      }
      return openBucket;
    }
    case "opportunity_development": {
      if (OPPORTUNITY_DEV_SIGNALS.has(signalId) || category === "sales") {
        return promoteOpenBucket(openBucket, 1);
      }
      if (isObservationIntelSignal(signalId)) {
        return capOpenBucketAt(promoteOpenBucket(openBucket, 1), "required_now");
      }
      if (ACCESS_SIGNALS.has(signalId)) {
        return demoteOpenBucket(openBucket, 1);
      }
      return openBucket;
    }
    default:
      return openBucket;
  }
}

/** Preferred signal order when picking the next open mapping question. */
export function discoveryMappingPreferredSignalOrderForFocusStage(
  focusStage: DiscoveryMappingFocusStageId,
): StageMappingSignalId[] {
  switch (focusStage) {
    case "access_pathway":
      return [...DISCOVERY_MAPPING_ACCESS_SIGNAL_ORDER];
    case "observation_intelligence":
      return [...DISCOVERY_MAPPING_OBSERVATION_INTEL_SIGNAL_ORDER];
    case "opportunity_development":
      return [...DISCOVERY_MAPPING_OPPORTUNITY_DEV_SIGNAL_ORDER];
    default:
      return [...DISCOVERY_MAPPING_ACCESS_SIGNAL_ORDER];
  }
}

/** Preferred category when picking the next open mapping question (fallback). */
export function discoveryMappingPreferredCategoriesForFocusStage(
  focusStage: DiscoveryMappingFocusStageId,
): DiscoveryMappingIntelligenceCategory[] {
  return discoveryMappingCategoryOrderForFocusStage(focusStage);
}
