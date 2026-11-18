/**
 * Provider overview — operational "What we know" buckets (not CRM field lists).
 */

import type { OperationalFieldSignal } from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import type { OperationalFieldSignalGroup } from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import { groupHeroSignals } from "@/lib/surgical-sales/providerOverviewMissionPresentation";
import type { OperationalChipStatus } from "@/lib/surgical-sales/providerOverviewMissionPresentation";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import type { ProviderDiscoveryMotionPhase } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import { isRelationshipFirstDiscovery } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { providerHasFieldIntelligenceEvidence } from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import { buildCredentialingPathwayOverviewState } from "@/lib/surgical-sales/facilityCredentialingIntelligence";

export const WHAT_WE_KNOW_OPERATIONAL_CATEGORY = {
  hospitalAffiliation: "Hospital affiliation",
  specialtyFocus: "Specialty focus",
  facilityAccessPathway: "Facility/vendor pathway",
  workflowVisibility: "Workflow visibility",
  schedulingOwnership: "Scheduling ownership",
  procedureVolume: "Procedure volume",
  productAlignment: "Product alignment",
  observationInterest: "Observation interest",
} as const;

export type ProviderOverviewWhatWeKnowItem = {
  label: string;
  subLines?: string[];
};

export type ProviderOverviewWhatWeKnowModel = {
  confirmed: ProviderOverviewWhatWeKnowItem[];
  validating: ProviderOverviewWhatWeKnowItem[];
  unknown: ProviderOverviewWhatWeKnowItem[];
};

const FACILITY_ACCESS_DB_KEYS = [
  "provider_credentialing_status",
  "provider_observation_credentialing_needed",
  "provider_credentialing_platform_name",
  "provider_observation_access_path",
  "provider_observation_feasibility",
] as const;

const WORKFLOW_VISIBILITY_DB_KEYS = [
  "provider_observation_best_days_case_types",
  "provider_preference_card_signals",
  "observation_history",
] as const;

const SCHEDULING_DB_KEYS = ["provider_observation_coordinator_contact"] as const;

const PRODUCT_ALIGNMENT_DB_KEYS = [
  "provider_evaluation_openness",
  "provider_competitive_products",
] as const;

const ACCESS_SUBLINE_BY_DB_KEY: Record<string, string> = {
  provider_credentialing_status: "Vendor clearance unknown",
  provider_observation_credentialing_needed: "Credentialing path not mapped",
  provider_credentialing_platform_name: "Credentialing platform not identified",
  provider_observation_access_path: "Facility/vendor path not confirmed",
  provider_observation_feasibility: "Observation approval not confirmed",
};

const WORKFLOW_SUBLINE_BY_DB_KEY: Record<string, string> = {
  observation_history: "OR workflow not observed yet",
  provider_observation_best_days_case_types: "Case-day workflow not mapped",
  provider_preference_card_signals: "Technique workflow not validated",
};

const SCHEDULING_SUBLINE_BY_DB_KEY: Record<string, string> = {
  provider_observation_coordinator_contact: "Scheduler not identified",
};

type Bucket = "confirmed" | "validating" | "unknown";

function flattenSignals(groups: OperationalFieldSignalGroup[]): OperationalFieldSignal[] {
  return groups.flatMap((g) => g.signals);
}

function aggregateBucket(statuses: OperationalChipStatus[]): Bucket {
  if (statuses.length === 0) return "validating";
  if (statuses.every((s) => s === "confirmed")) return "confirmed";
  if (statuses.some((s) => s === "confirmed")) return "validating";
  if (statuses.every((s) => s === "not_observed")) return "unknown";
  return "validating";
}

function subLinesForKeys(
  signals: OperationalFieldSignal[],
  dbKeys: readonly string[],
  sublineMap: Record<string, string>,
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const dbKey of dbKeys) {
    const signal = signals.find((s) => s.dbKey === dbKey);
    if (!signal || signal.chipStatus === "confirmed") continue;
    const line = sublineMap[dbKey];
    if (!line || seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }
  return lines.slice(0, 3);
}

function statusesForKeys(signals: OperationalFieldSignal[], dbKeys: readonly string[]): OperationalChipStatus[] {
  return dbKeys
    .map((key) => signals.find((s) => s.dbKey === key)?.chipStatus)
    .filter((s): s is OperationalChipStatus => Boolean(s));
}

function pushItem(
  target: Record<Bucket, ProviderOverviewWhatWeKnowItem[]>,
  bucket: Bucket,
  label: string,
  subLines?: string[],
) {
  const trimmedSubs = subLines?.filter(Boolean);
  const existing = target[bucket].find((i) => i.label === label);
  if (existing) {
    if (trimmedSubs?.length) {
      existing.subLines = [...new Set([...(existing.subLines ?? []), ...trimmedSubs])].slice(0, 3);
    }
    return;
  }
  target[bucket].push({
    label,
    subLines: trimmedSubs?.length ? trimmedSubs : undefined,
  });
}

function hasText(value: unknown): boolean {
  return Boolean(String(value ?? "").trim());
}

export function whatWeKnowItemLabels(items: ProviderOverviewWhatWeKnowItem[]): string[] {
  return items.map((i) => i.label);
}

export function buildProviderOverviewWhatWeKnow(input: {
  signalGroups: OperationalFieldSignalGroup[];
  contact: Record<string, unknown>;
  organizationName?: string | null;
  specialty?: string | null;
  discoveryPhase?: ProviderDiscoveryMotionPhase;
  engagements?: ProviderEngagementSummary[];
}): ProviderOverviewWhatWeKnowModel {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const hasFieldEvidence = providerHasFieldIntelligenceEvidence({
    contact: input.contact,
    engagements: input.engagements,
  });

  const buckets: Record<Bucket, ProviderOverviewWhatWeKnowItem[]> = {
    confirmed: [],
    validating: [],
    unknown: [],
  };

  const orgLinked =
    hasText(input.organizationName) ||
    hasText(contact.organization_id) ||
    hasText(contact.account_id);

  if (orgLinked) {
    pushItem(buckets, "confirmed", WHAT_WE_KNOW_OPERATIONAL_CATEGORY.hospitalAffiliation);
  }

  const specialty =
    String(input.specialty ?? contact.specialty ?? "").trim() ||
    String(contact.provider_specialty ?? "").trim();
  if (specialty) {
    pushItem(buckets, "confirmed", WHAT_WE_KNOW_OPERATIONAL_CATEGORY.specialtyFocus);
  }

  if (!hasFieldEvidence) {
    return sortWhatWeKnowModel(buckets);
  }

  const relationshipFirst =
    !hasProviderObservationApprovalValidated(contact) ||
    input.discoveryPhase === "relationship_first" ||
    (input.discoveryPhase == null &&
      isRelationshipFirstDiscovery({
        contact,
        engagements: input.engagements,
      }));
  const grouped = groupHeroSignals(input.signalGroups);
  const signals = [
    ...grouped.blockers,
    ...grouped.confirmed,
    ...grouped.unknown,
  ];

  if (!relationshipFirst) {
    const accessStatuses = statusesForKeys(signals, FACILITY_ACCESS_DB_KEYS);
    const accessBucket = aggregateBucket(accessStatuses);
    let accessSubs = subLinesForKeys(signals, FACILITY_ACCESS_DB_KEYS, ACCESS_SUBLINE_BY_DB_KEY);
    const credOverview = buildCredentialingPathwayOverviewState(contact);
    if (!credOverview.hasStructuredIntel && credOverview.promoteToBlocker) {
      accessSubs = [
        credOverview.line,
        ...accessSubs.filter((line) => line !== ACCESS_SUBLINE_BY_DB_KEY.provider_observation_credentialing_needed),
      ].slice(0, 3);
    }
    pushItem(
      buckets,
      accessBucket,
      WHAT_WE_KNOW_OPERATIONAL_CATEGORY.facilityAccessPathway,
      accessBucket === "validating" ? accessSubs : undefined,
    );
  }

  const workflowStatuses = statusesForKeys(signals, WORKFLOW_VISIBILITY_DB_KEYS);
  const workflowBucket = aggregateBucket(workflowStatuses);
  const workflowSubs = subLinesForKeys(signals, WORKFLOW_VISIBILITY_DB_KEYS, WORKFLOW_SUBLINE_BY_DB_KEY);
  pushItem(
    buckets,
    workflowBucket === "unknown" ? "validating" : workflowBucket,
    WHAT_WE_KNOW_OPERATIONAL_CATEGORY.workflowVisibility,
    workflowBucket !== "confirmed" ? workflowSubs : undefined,
  );

  if (!relationshipFirst) {
    const schedulingStatuses = statusesForKeys(signals, SCHEDULING_DB_KEYS);
    const schedulingBucket = aggregateBucket(schedulingStatuses);
    const schedulingSubs = subLinesForKeys(signals, SCHEDULING_DB_KEYS, SCHEDULING_SUBLINE_BY_DB_KEY);
    pushItem(
      buckets,
      schedulingBucket,
      WHAT_WE_KNOW_OPERATIONAL_CATEGORY.schedulingOwnership,
      schedulingBucket === "validating" ? schedulingSubs : undefined,
    );
  }

  const procedureValidated = isIntelligenceFieldValidatedOnFile("provider_procedure_focus", contact);
  pushItem(
    buckets,
    procedureValidated ? "confirmed" : "unknown",
    WHAT_WE_KNOW_OPERATIONAL_CATEGORY.procedureVolume,
  );

  if (relationshipFirst) {
    const interestValidated = isIntelligenceFieldValidatedOnFile(
      "provider_evaluation_openness",
      contact,
    );
    const interestSignal = fieldHasIntelligenceSignal(
      "provider_evaluation_openness",
      contact.provider_evaluation_openness as string | null | undefined,
    );
    pushItem(
      buckets,
      interestValidated ? "confirmed" : interestSignal ? "validating" : "unknown",
      WHAT_WE_KNOW_OPERATIONAL_CATEGORY.observationInterest,
    );
  }

  const productStatuses = PRODUCT_ALIGNMENT_DB_KEYS.map((key) => {
    if (isIntelligenceFieldValidatedOnFile(key, contact)) return "confirmed" as const;
    const signal = signals.find((s) => s.dbKey === key);
    return signal?.chipStatus ?? "not_observed";
  });
  const productBucket = aggregateBucket(productStatuses);
  pushItem(
    buckets,
    productBucket === "confirmed" ? "confirmed" : "unknown",
    WHAT_WE_KNOW_OPERATIONAL_CATEGORY.productAlignment,
  );

  const total =
    buckets.confirmed.length + buckets.validating.length + buckets.unknown.length;

  if (total === 0) {
    return buckets;
  }

  return sortWhatWeKnowModel(buckets);
}

const CONFIRMED_ORDER = [
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.hospitalAffiliation,
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.specialtyFocus,
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.facilityAccessPathway,
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.workflowVisibility,
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.schedulingOwnership,
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.procedureVolume,
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.productAlignment,
];

const VALIDATING_ORDER = [
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.facilityAccessPathway,
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.workflowVisibility,
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.schedulingOwnership,
];

const UNKNOWN_ORDER = [
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.procedureVolume,
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY.productAlignment,
];

function sortBucket(items: ProviderOverviewWhatWeKnowItem[], order: string[]) {
  const rank = new Map(order.map((label, i) => [label, i]));
  return [...items].sort(
    (a, b) => (rank.get(a.label) ?? 99) - (rank.get(b.label) ?? 99),
  );
}

function sortWhatWeKnowModel(
  buckets: Record<Bucket, ProviderOverviewWhatWeKnowItem[]>,
): ProviderOverviewWhatWeKnowModel {
  return {
    confirmed: sortBucket(buckets.confirmed, CONFIRMED_ORDER),
    validating: sortBucket(buckets.validating, VALIDATING_ORDER),
    unknown: sortBucket(buckets.unknown, UNKNOWN_ORDER),
  };
}

/** @deprecated Legacy flat-line helper for tests */
export function flattenWhatWeKnowLines(model: ProviderOverviewWhatWeKnowModel): string[] {
  return [
    ...whatWeKnowItemLabels(model.confirmed),
    ...whatWeKnowItemLabels(model.validating),
    ...whatWeKnowItemLabels(model.unknown),
  ];
}
