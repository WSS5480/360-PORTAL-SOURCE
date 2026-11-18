/**
 * Operational mapping workflow — progress, badges, and rep-facing CTAs.
 */

import {
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  buildInteractionCaptureRecommendations,
  fieldHasIntelligenceSignal,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { buildIntelligenceSectionCaptureSummary } from "@/lib/surgical-sales/providerIntelligenceSectionSummary";
import { intelligenceSectionWhyItMatters } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import {
  buildProgressiveCaptureSteps,
  type ProgressiveCaptureStep,
} from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import {
  resolveIntelligenceCardReadiness,
  type IntelligenceCardReadinessTone,
} from "@/lib/surgical-sales/providerIntelligenceCardStatus";

/** @deprecated Prefer resolveIntelligenceCardReadiness — kept for tests and imports */
export const OPERATIONAL_MAPPING_STATUS_BADGE: Record<IntelligenceSectionConfidence, string> = {
  unknown: "Not started",
  partial: "Developing",
  confirmed: "Partial",
  validated: "Confirmed",
};

/** Per unresolved item — rep-facing action labels (Rapid Discovery / progressive capture). */
export const UNRESOLVED_ITEM_ACTION_LABELS = {
  answerNow: "Confirm",
  skip: "Skip",
  dontKnowYet: "Unknown",
  notRelevant: "Not relevant",
} as const;

export type SectionOperationalMappingProgress = {
  mapped: number;
  total: number;
  unresolvedCount: number;
  confidence: IntelligenceSectionConfidence;
  readinessTone: IntelligenceCardReadinessTone;
  statusBadge: string;
  metricsLine: string;
  /** @deprecated Use metricsLine */
  mappedLine: string;
  /** @deprecated Use metricsLine */
  unresolvedLine: string | null;
  /** @deprecated Use metricsLine */
  progressLines: string[];
};

export function buildSectionOperationalMappingProgress(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  options?: {
    planning?: ProviderPlanningCompletion | null;
    confidence?: IntelligenceSectionConfidence;
    fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  },
): SectionOperationalMappingProgress {
  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
  const total = keys.length;
  let mapped = 0;
  for (const dbKey of keys) {
    const raw = contact[dbKey] as string | null | undefined;
    if (fieldHasIntelligenceSignal(dbKey, raw)) mapped += 1;
  }

  const unresolved = buildIntelligenceLearningGaps(contact, options?.planning, 24).filter(
    (g) => g.sectionId === sectionId,
  );
  const deferredCount = keys.filter((dbKey) => {
    const stance = options?.fieldMetadata?.[dbKey]?.discovery_stance;
    return stance === "unknown" || stance === "ask_next_touch" || stance === "needs_validation";
  }).length;

  const unresolvedCount = Math.max(unresolved.length, deferredCount);

  const confidence: IntelligenceSectionConfidence =
    options?.confidence ??
    (mapped === 0
      ? "unknown"
      : mapped >= total && total > 0
        ? "validated"
        : mapped >= Math.ceil(total * 0.6)
          ? "confirmed"
          : "partial");

  const readiness = resolveIntelligenceCardReadiness({
    mapped,
    total,
    unresolvedCount,
    confidence,
  });

  const mappedLine = total > 0 ? `${mapped} of ${total} mapped` : "No fields tracked";
  const unresolvedLine =
    unresolvedCount > 0
      ? `${unresolvedCount} open item${unresolvedCount === 1 ? "" : "s"}`
      : null;

  return {
    mapped,
    total,
    unresolvedCount,
    confidence,
    readinessTone: readiness.tone,
    statusBadge: readiness.label,
    metricsLine: readiness.metricsLine,
    mappedLine,
    unresolvedLine,
    progressLines: [readiness.metricsLine],
  };
}

export type OperationalMappingSectionBrief = {
  knownItems: string[];
  unresolvedItems: Array<{ dbKey: string; label: string; phrase: string }>;
  whyItMatters: string;
  tacticalQuestions: string[];
};

export function buildOperationalMappingSectionBrief(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  sectionConfidence?: IntelligenceSectionConfidence,
): OperationalMappingSectionBrief {
  const knownItems = buildIntelligenceSectionCaptureSummary(sectionId, contact, 6);
  const gaps = buildIntelligenceLearningGaps(contact, planning, 12).filter(
    (g) => g.sectionId === sectionId,
  );
  const unresolvedItems = gaps.map((g) => ({
    dbKey: g.dbKey,
    label: g.phrase,
    phrase: g.phrase,
  }));

  const recommendations = buildInteractionCaptureRecommendations(contact, planning, 4).filter(
    (r) => r.sectionId === sectionId,
  );
  const tacticalQuestions = recommendations.map((r) => r.prompt);

  const steps = buildProgressiveCaptureSteps(sectionId, contact, {
    includeAnswered: false,
    sectionConfidence,
  });
  for (const step of steps) {
    if (tacticalQuestions.length >= 5) break;
    if (!tacticalQuestions.includes(step.prompt)) tacticalQuestions.push(step.prompt);
  }

  return {
    knownItems,
    unresolvedItems,
    whyItMatters: intelligenceSectionWhyItMatters(sectionId),
    tacticalQuestions: tacticalQuestions.slice(0, 5),
  };
}

export function intelligenceMappingCtaLabel(input: {
  mapped: number;
  total: number;
  unresolvedCount: number;
  confidence?: IntelligenceSectionConfidence;
}): string {
  const { mapped, unresolvedCount, confidence } = input;
  if (mapped === 0 || confidence === "unknown") return "Resolve unknowns";
  if (unresolvedCount > 0 || confidence === "partial") return "Continue mapping";
  return "Update operational intelligence";
}

export function buildUnresolvedMappingQueue(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  sectionConfidence?: IntelligenceSectionConfidence,
  emphasizeDbKey?: string,
): ProgressiveCaptureStep[] {
  const steps = buildProgressiveCaptureSteps(sectionId, contact, {
    includeAnswered: false,
    sectionConfidence,
  });
  if (!emphasizeDbKey) return steps;
  const idx = steps.findIndex((s) => s.dbKey === emphasizeDbKey);
  if (idx <= 0) return steps;
  return [...steps.slice(idx), ...steps.slice(0, idx)];
}
