/**
 * Mission readiness — progressive operational understanding per intelligence area.
 * Distinguishes "not explored yet" from "high risk / politically opaque" without punitive CRM framing.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  deriveIntelligenceSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type {
  IntelligenceFieldAttribution,
  ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { parseIntelligenceCaptureValue } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { findPlanningSection } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  isOperationalExecutionRiskDbKey,
} from "@/lib/surgical-sales/discoveryOpenItemsVocabulary";
import {
  OPERATIONAL_INTEL_READINESS_HINTS,
  OPERATIONAL_INTEL_READINESS_STATUS,
} from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";

/** Rep-facing readiness badge on intelligence cards. */
export type OperationalIntelligenceAreaStatus =
  | "confirmed"
  | "partial"
  | "high_risk"
  | "not_explored";

/** Why intelligence is missing — drives risk copy, not blame. */
export type OperationalIntelligenceUncertaintyKind = "unexplored" | "opaque";

export const INTELLIGENCE_DISCOVERY_STANCES = [
  "skipped",
  "unknown",
  "needs_validation",
  "ask_next_touch",
  "not_relevant",
] as const;

export type IntelligenceDiscoveryStance = (typeof INTELLIGENCE_DISCOVERY_STANCES)[number];

export const DISCOVERY_STANCE_LABELS: Record<IntelligenceDiscoveryStance, string> = {
  skipped: "Skipped for now",
  unknown: "Unknown",
  needs_validation: "Needs validation",
  ask_next_touch: "Ask on next touch",
  not_relevant: "Not relevant",
};

/** Fields excluded from guided / rapid discovery queues. */
export function isIntelligenceFieldDeprioritizedForDiscovery(
  dbKey: string,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): boolean {
  return fieldMetadata?.[dbKey]?.discovery_stance === "not_relevant";
}

export const OPERATIONAL_INTELLIGENCE_STATUS_LABELS: Record<
  OperationalIntelligenceAreaStatus,
  string
> = { ...OPERATIONAL_INTEL_READINESS_STATUS };

export const OPERATIONAL_INTELLIGENCE_STATUS_HINTS: Record<
  OperationalIntelligenceAreaStatus,
  string
> = { ...OPERATIONAL_INTEL_READINESS_HINTS };

const OPAQUE_SIGNAL_PATTERN =
  /\b(locked|lock-?in|committee|denied|won'?t allow|politic|opaque|blocked|no new vendor|incumbent only|rep limit)\b/i;

const CRITICAL_SECTIONS = new Set<ProviderIntelligenceSectionId>([
  "or_environment",
  "observation_readiness",
  "commercial_signals",
]);

function sectionHasAnySignal(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
): boolean {
  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
  return keys.some((dbKey) =>
    fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined),
  );
}

function sectionHasStanceOrInvestigation(
  sectionId: ProviderIntelligenceSectionId,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): boolean {
  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
  return keys.some((dbKey) => {
    const meta = fieldMetadata?.[dbKey];
    return Boolean(meta?.discovery_stance);
  });
}

export function fieldValueSuggestsOpaqueAccount(
  dbKey: string,
  raw: string | null | undefined,
): boolean {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return false;
  if (OPAQUE_SIGNAL_PATTERN.test(trimmed)) return true;
  const spec = parseIntelligenceCaptureValue(dbKey, trimmed);
  if (spec.token === "unknown" || spec.tokens.includes("unknown")) return false;
  if (spec.tokens.some((t) => OPAQUE_SIGNAL_PATTERN.test(t))) return true;
  return false;
}

export function inferUncertaintyKindForGap(
  gap: IntelligenceLearningGap | null,
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): OperationalIntelligenceUncertaintyKind | null {
  if (!gap) return null;
  const meta = fieldMetadata?.[gap.dbKey];
  if (meta?.uncertainty_kind === "opaque" || meta?.uncertainty_kind === "unexplored") {
    return meta.uncertainty_kind;
  }
  if (meta?.discovery_stance === "unknown" && meta.uncertainty_kind === "opaque") return "opaque";
  const raw = contact[gap.dbKey] as string | null | undefined;
  if (fieldValueSuggestsOpaqueAccount(gap.dbKey, raw)) return "opaque";
  if (gap.state === "partial") return "opaque";
  return "unexplored";
}

export function deriveOperationalIntelligenceAreaStatus(input: {
  sectionId: ProviderIntelligenceSectionId;
  contact: Record<string, unknown>;
  gap: IntelligenceLearningGap | null;
  sectionConfidence?: IntelligenceSectionConfidence;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  planning?: ProviderPlanningCompletion | null;
}): {
  status: OperationalIntelligenceAreaStatus;
  uncertaintyKind: OperationalIntelligenceUncertaintyKind | null;
  readinessScore: number;
  missionLabel: string;
} {
  const sectionConfidence =
    input.sectionConfidence ??
    findPlanningSection(input.planning, input.sectionId)?.confidence ??
    deriveIntelligenceSectionConfidence(input.sectionId, input.contact, {
      fieldMetadata: input.fieldMetadata,
    }).confidence;

  const hasSignal = sectionHasAnySignal(input.sectionId, input.contact);
  const investigated = hasSignal || sectionHasStanceOrInvestigation(input.sectionId, input.fieldMetadata);
  const uncertaintyKind = inferUncertaintyKindForGap(input.gap, input.contact, input.fieldMetadata);

  let status: OperationalIntelligenceAreaStatus;

  if (!investigated && !input.gap) {
    status = "not_explored";
  } else if (uncertaintyKind === "opaque" && input.gap) {
    status = "high_risk";
  } else if (
    input.gap &&
    !hasSignal &&
    isOperationalExecutionRiskDbKey(input.gap.dbKey, input.sectionId) &&
    (uncertaintyKind === "opaque" || CRITICAL_SECTIONS.has(input.sectionId))
  ) {
    status = "high_risk";
  } else if (sectionConfidence === "validated" || sectionConfidence === "confirmed") {
    status =
      input.gap?.state === "partial" || input.gap?.state === "outdated" ? "partial" : "confirmed";
  } else if (sectionConfidence === "partial" || input.gap?.state === "partial") {
    status = "partial";
  } else if (input.gap) {
    status = "partial";
  } else if (!hasSignal) {
    status = "not_explored";
  } else {
    status = "partial";
  }

  const readinessScore = operationalReadinessScoreForStatus(status);
  const missionLabel = missionReadinessLabel(status, uncertaintyKind);

  return { status, uncertaintyKind, readinessScore, missionLabel };
}

export function operationalReadinessScoreForStatus(
  status: OperationalIntelligenceAreaStatus,
): number {
  switch (status) {
    case "confirmed":
      return 100;
    case "partial":
      return 58;
    case "high_risk":
      return 28;
    case "not_explored":
    default:
      return 12;
  }
}

export function missionReadinessLabel(
  status: OperationalIntelligenceAreaStatus,
  uncertaintyKind: OperationalIntelligenceUncertaintyKind | null,
): string {
  if (status === "not_explored") {
    return uncertaintyKind === "opaque"
      ? "Still learning — access may be politically locked"
      : "Still learning — add operational context first";
  }
  if (status === "high_risk") {
    return uncertaintyKind === "opaque"
      ? "Operational risk — politically opaque or locked"
      : "Operational risk — may block field execution";
  }
  if (status === "partial") {
    return uncertaintyKind === "opaque"
      ? "Partially clear — validate before case day"
      : "Partially clear — confirm on next touch";
  }
  return OPERATIONAL_INTELLIGENCE_STATUS_LABELS.confirmed;
}

export type OperationalMissionReadinessRow = {
  areaId: string;
  sectionId: ProviderIntelligenceSectionId;
  title: string;
  status: OperationalIntelligenceAreaStatus;
  uncertaintyKind: OperationalIntelligenceUncertaintyKind | null;
  readinessScore: number;
  statusLabel: string;
  missionLabel: string;
};

export function buildMissionReadinessScore(input: {
  rows: Array<{ readinessScore: number }>;
}): number {
  if (input.rows.length === 0) return 0;
  const sum = input.rows.reduce((acc, r) => acc + r.readinessScore, 0);
  return Math.round(sum / input.rows.length);
}

export function stanceMetadataPatch(params: {
  existing: ProviderIntelligenceFieldMetadataMap;
  dbKey: string;
  stance: IntelligenceDiscoveryStance;
  uncertaintyKind?: OperationalIntelligenceUncertaintyKind;
  actor: { userId: string; userName: string };
  captureContext: IntelligenceFieldAttribution["source_type"];
  now?: Date;
}): ProviderIntelligenceFieldMetadataMap {
  const nowIso = (params.now ?? new Date()).toISOString();
  const prior = params.existing[params.dbKey];
  const next = { ...params.existing };
  next[params.dbKey] = {
    source_type: prior?.source_type ?? params.captureContext,
    source_label: prior?.source_label ?? "Discovery session",
    source_engagement_id: prior?.source_engagement_id,
    source_case_id: prior?.source_case_id,
    updated_at: nowIso,
    updated_by_user_id: params.actor.userId,
    updated_by_name: params.actor.userName,
    lifecycle_state: params.stance === "needs_validation" ? "assumed" : prior?.lifecycle_state ?? "captured",
    confirmed_at: prior?.confirmed_at,
    validated_at: prior?.validated_at,
    discovery_stance: params.stance,
    uncertainty_kind: params.uncertaintyKind ?? prior?.uncertainty_kind,
  };
  return next;
}
