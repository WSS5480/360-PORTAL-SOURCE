/**
 * Stage mapping question registry — pathway-aware visibility from operational intelligence gaps.
 */

import type { DiscoveryIntelligenceMaturity } from "@/lib/surgical-sales/discoveryIntelligenceMaturity";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { IntelligenceDiscoveryStance } from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import type { PathwayIntelligenceSignalState } from "@/lib/surgical-sales/pathwayStageIntelligence";
import {
  SALES_PATHWAY_STAGE_RANK,
  type PathwayIntelligenceSignalId,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";

export type StageMappingVisibilityBucket =
  | "required_now"
  | "helpful_next"
  | "later_stage"
  | "confirmed"
  | "hidden";

export type StageMappingOpenBucket = "required_now" | "helpful_next" | "later_stage";

type RegistryEntry = {
  signalId: StageMappingSignalId;
  dbKeys: string[];
  /** Earliest pathway stage where this question can surface. */
  activeFromStage: SalesPathwayStageId;
  /** Latest pathway stage (inclusive); omit to keep visible through outcomes. */
  activeThroughStage?: SalesPathwayStageId;
  /** Default open bucket when the signal is still unresolved. */
  defaultOpenBucket: StageMappingOpenBucket;
  /** Bucket when intelligence is captured but still needs validation. */
  needsValidationBucket: StageMappingOpenBucket;
  /** Pathway intelligence gaps that elevate this question to Required now. */
  requiredGapIds: PathwayIntelligenceSignalId[];
};

/** Discovery → Observe operational dependencies (pathway intelligence). */
const DISCOVERY_OBSERVE_ACCESS_GAPS: PathwayIntelligenceSignalId[] = [
  "observation_approval",
  "scheduling_owner",
  "facility_access_requirements",
  "credentialing_requirement",
];

import { OPPORTUNITY_INTELLIGENCE_SIGNALS } from "@/lib/surgical-sales/opportunityIntelligenceSignals";

const OPPORTUNITY_REGISTRY_ENTRIES: RegistryEntry[] = OPPORTUNITY_INTELLIGENCE_SIGNALS.map(
  (spec) => ({
    signalId: spec.id as StageMappingSignalId,
    dbKeys: spec.dbKeys,
    activeFromStage: "discovery",
    defaultOpenBucket: "helpful_next",
    needsValidationBucket: "helpful_next",
    requiredGapIds: [],
  }),
);

const STAGE_MAPPING_QUESTION_REGISTRY: RegistryEntry[] = [
  ...OPPORTUNITY_REGISTRY_ENTRIES,
  {
    signalId: "observation_approval",
    dbKeys: ["provider_observation_feasibility", "provider_evaluation_openness"],
    activeFromStage: "discovery",
    activeThroughStage: "observe",
    defaultOpenBucket: "helpful_next",
    needsValidationBucket: "helpful_next",
    requiredGapIds: ["observation_approval"],
  },
  {
    signalId: "scheduling_owner",
    dbKeys: [
      "provider_scheduling_contact",
      "provider_observation_coordinator_contact",
      "provider_facility_scheduling_contact",
      "provider_observation_scheduling_control",
    ],
    activeFromStage: "discovery",
    activeThroughStage: "observe",
    defaultOpenBucket: "helpful_next",
    needsValidationBucket: "helpful_next",
    requiredGapIds: ["scheduling_owner"],
  },
  {
    signalId: "facility_vendor_pathway",
    dbKeys: [
      "provider_observation_access_path",
      "provider_observation_credentialing_needed",
      "provider_credentialing_status",
    ],
    activeFromStage: "discovery",
    activeThroughStage: "observe",
    defaultOpenBucket: "helpful_next",
    needsValidationBucket: "helpful_next",
    requiredGapIds: ["facility_access_requirements", "credentialing_requirement"],
  },
  {
    signalId: "observation_logistics",
    dbKeys: ["provider_observation_best_days_case_types", "provider_ideal_observation_cases"],
    activeFromStage: "discovery",
    activeThroughStage: "observe",
    defaultOpenBucket: "helpful_next",
    needsValidationBucket: "helpful_next",
    requiredGapIds: ["target_observation_dates"],
  },
  {
    signalId: "clinical_champion",
    dbKeys: ["provider_champion_potential", "provider_or_team_dynamics"],
    activeFromStage: "discovery",
    defaultOpenBucket: "helpful_next",
    needsValidationBucket: "helpful_next",
    requiredGapIds: [],
  },
  {
    signalId: "workflow_visibility",
    dbKeys: [
      "provider_procedure_focus",
      "provider_technique_preferences",
      "provider_workflow_pain_points",
    ],
    activeFromStage: "discovery",
    activeThroughStage: "debrief",
    defaultOpenBucket: "helpful_next",
    needsValidationBucket: "helpful_next",
    requiredGapIds: [],
  },
  {
    signalId: "product_alignment",
    dbKeys: [
      "provider_preference_card_signals",
      "provider_competitive_products",
      "provider_workflow_pain_points",
    ],
    activeFromStage: "discovery",
    activeThroughStage: "debrief",
    defaultOpenBucket: "helpful_next",
    needsValidationBucket: "helpful_next",
    requiredGapIds: [],
  },
  {
    signalId: "case_opportunity",
    dbKeys: ["provider_case_volume_estimate", "provider_ideal_observation_cases"],
    activeFromStage: "discovery",
    defaultOpenBucket: "later_stage",
    needsValidationBucket: "helpful_next",
    requiredGapIds: ["committed_case_target"],
  },
];

const REGISTRY_BY_SIGNAL = new Map(
  STAGE_MAPPING_QUESTION_REGISTRY.map((entry) => [entry.signalId, entry]),
);

export function stageMappingRegistryEntry(
  signalId: StageMappingSignalId,
): RegistryEntry | null {
  return REGISTRY_BY_SIGNAL.get(signalId) ?? null;
}

export function stageMappingRegistryDbKeys(signalId: StageMappingSignalId): string[] {
  return stageMappingRegistryEntry(signalId)?.dbKeys ?? [];
}

export function discoveryObserveRequiredGapIds(): PathwayIntelligenceSignalId[] {
  return [...DISCOVERY_OBSERVE_ACCESS_GAPS];
}

function pathwayStageInRange(
  pathwayStageId: SalesPathwayStageId,
  from: SalesPathwayStageId,
  through?: SalesPathwayStageId,
): boolean {
  const rank = SALES_PATHWAY_STAGE_RANK[pathwayStageId];
  if (rank < SALES_PATHWAY_STAGE_RANK[from]) return false;
  if (through != null && rank > SALES_PATHWAY_STAGE_RANK[through]) return false;
  return true;
}

function primaryDiscoveryStance(
  dbKeys: string[],
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): IntelligenceDiscoveryStance | undefined {
  for (const dbKey of dbKeys) {
    const stance = fieldMeta[dbKey]?.discovery_stance;
    if (stance) return stance;
  }
  return undefined;
}

function isConfirmedIntelligence(input: {
  maturity: DiscoveryIntelligenceMaturity;
  statusLabel: string;
  dbKeys: string[];
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
}): boolean {
  if (input.statusLabel === DISCOVERY_FIELD_STATUS.validated) return true;
  if (input.maturity === "confirmed") return true;
  return input.dbKeys.some((dbKey) => {
    const meta = input.fieldMeta[dbKey];
    return Boolean(meta?.validated_at?.trim() || meta?.lifecycle_state === "validated");
  });
}

function needsValidationIntelligence(input: {
  maturity: DiscoveryIntelligenceMaturity;
  statusLabel: string;
  dbKeys: string[];
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
}): boolean {
  const stance = primaryDiscoveryStance(input.dbKeys, input.fieldMeta);
  if (stance === "needs_validation" || stance === "ask_next_touch") return true;
  if (input.maturity === "partial") return true;
  if (input.maturity === "likely") return true;
  if (input.statusLabel === DISCOVERY_FIELD_STATUS.captured) return true;
  if (input.statusLabel === DISCOVERY_FIELD_STATUS.conditional) return true;
  return input.dbKeys.some((dbKey) => {
    const meta = input.fieldMeta[dbKey];
    return meta?.lifecycle_state === "assumed" || meta?.lifecycle_state === "captured";
  });
}

/**
 * Resolve which operational bucket a mapping question belongs in for the current pathway context.
 */
export function resolveStageMappingVisibilityBucket(input: {
  signalId: StageMappingSignalId;
  pathwayStageId: SalesPathwayStageId;
  maturity: DiscoveryIntelligenceMaturity;
  statusLabel: string;
  dbKeys: string[];
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  pathwayGaps?: PathwayIntelligenceSignalState[];
}): StageMappingVisibilityBucket {
  const entry = stageMappingRegistryEntry(input.signalId);
  if (!entry) return "hidden";

  if (
    !pathwayStageInRange(
      input.pathwayStageId,
      entry.activeFromStage,
      entry.activeThroughStage,
    )
  ) {
    return "hidden";
  }

  const stance = primaryDiscoveryStance(input.dbKeys, input.fieldMeta);
  if (stance === "not_relevant") return "hidden";

  if (
    isConfirmedIntelligence({
      maturity: input.maturity,
      statusLabel: input.statusLabel,
      dbKeys: input.dbKeys,
      fieldMeta: input.fieldMeta,
    })
  ) {
    return "confirmed";
  }

  if (
    needsValidationIntelligence({
      maturity: input.maturity,
      statusLabel: input.statusLabel,
      dbKeys: input.dbKeys,
      fieldMeta: input.fieldMeta,
    })
  ) {
    return entry.needsValidationBucket;
  }

  if (stance === "unknown" && input.maturity === "unknown") {
    return entry.defaultOpenBucket;
  }

  return entry.defaultOpenBucket;
}

export function stageMappingOpenBucketSortKey(bucket: StageMappingOpenBucket): number {
  switch (bucket) {
    case "required_now":
      return 0;
    case "helpful_next":
      return 1;
    case "later_stage":
      return 2;
    default:
      return 3;
  }
}
