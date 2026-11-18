/**
 * Discovery Mapping — High / Medium / Low confidence for applied intelligence findings.
 *
 * High: directly stated and validated on file, manually confirmed, or corroborated by
 *       multiple independent captures.
 * Medium: mentioned clearly once (e.g. a single debrief capture without inference).
 * Low: inferred from notes, partial leads, or uncertainty language — needs validation.
 */

import { textHasUncertaintyMarkers } from "@/lib/surgical-sales/intelligenceClassificationGuardrails";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceFieldAttribution,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { StageMappingValidationStatus } from "@/lib/surgical-sales/stageMappingAnswerTypes";
import { stageMappingRegistryDbKeys } from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import {
  inferStageMappingValidationStatus,
  isDebriefExtractionSource,
  isManualMappingSource,
  resolveStageMappingSignalAttribution,
} from "@/lib/surgical-sales/stageMappingSourceAttribution";

export type DiscoveryMappingIntelligenceConfidenceLevel = "high" | "medium" | "low";

export const DISCOVERY_MAPPING_INTELLIGENCE_CONFIDENCE_LABEL: Record<
  DiscoveryMappingIntelligenceConfidenceLevel,
  string
> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const INFERENCE_MARKERS =
  /\b(?:might|may(?:\s+be(?:\s+involved)?|\s+also)?|possibly|perhaps|appears?\s+to|seems?\s+to|not\s+(?:yet\s+)?confirmed|unclear\s+whether|inferred|we\s+think|likely\s+(?:involved|handles?))\b/i;

const PARTIAL_LEAD_RE = /\[Partial lead\]/i;

export function discoveryMappingIntelligenceConfidenceDisplay(
  level: DiscoveryMappingIntelligenceConfidenceLevel,
): string {
  return `Confidence: ${DISCOVERY_MAPPING_INTELLIGENCE_CONFIDENCE_LABEL[level]}`;
}

/** Lower rank = needs validation sooner. */
export function compareDiscoveryMappingIntelligenceConfidenceForValidation(
  a: DiscoveryMappingIntelligenceConfidenceLevel | undefined,
  b: DiscoveryMappingIntelligenceConfidenceLevel | undefined,
): number {
  const rank: Record<DiscoveryMappingIntelligenceConfidenceLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };
  return rank[a ?? "medium"] - rank[b ?? "medium"];
}

export function textSuggestsInferredIntelligence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (PARTIAL_LEAD_RE.test(trimmed)) return true;
  if (INFERENCE_MARKERS.test(trimmed)) return true;
  return textHasUncertaintyMarkers(trimmed);
}

function countCorroboratingCaptures(
  fieldMeta: ProviderIntelligenceFieldMetadataMap | undefined,
  dbKeys: string[] | undefined,
): number {
  if (!fieldMeta || !dbKeys?.length) return 0;

  const sources = new Set<string>();
  for (const dbKey of dbKeys) {
    const meta = fieldMeta[dbKey];
    if (!meta?.source_label?.trim()) continue;
    sources.add(`${meta.source_type}:${meta.source_label.trim().toLowerCase()}`);
  }
  return sources.size;
}

function isValidatedOnFile(input: {
  meta?: IntelligenceFieldAttribution | null;
  fieldMeta?: ProviderIntelligenceFieldMetadataMap;
  dbKeys?: string[];
}): boolean {
  if (input.meta?.validated_at || input.meta?.lifecycle_state === "validated") return true;
  return (input.dbKeys ?? []).some(
    (key) =>
      Boolean(input.fieldMeta?.[key]?.validated_at) ||
      input.fieldMeta?.[key]?.lifecycle_state === "validated",
  );
}

export function resolveDiscoveryMappingIntelligenceConfidence(input: {
  validationStatus: StageMappingValidationStatus;
  summary?: string | null;
  evidenceText?: string | null;
  meta?: IntelligenceFieldAttribution | null;
  fieldMeta?: ProviderIntelligenceFieldMetadataMap;
  dbKeys?: string[];
  resolved?: boolean;
}): DiscoveryMappingIntelligenceConfidenceLevel {
  const blob = [input.summary, input.evidenceText].filter(Boolean).join(" ");
  const inferred = textSuggestsInferredIntelligence(blob);
  const corroborating = countCorroboratingCaptures(input.fieldMeta, input.dbKeys);
  const validatedOnFile = isValidatedOnFile(input);
  const meta = input.meta;

  if (inferred) return "low";

  if (input.validationStatus === "needs_validation") return "medium";
  if (input.validationStatus === "unknown" && !blob.trim()) return "low";
  if (input.validationStatus === "likely") return "medium";

  if (
    validatedOnFile &&
    (input.validationStatus === "confirmed" || input.resolved)
  ) {
    return "high";
  }

  if (
    input.validationStatus === "confirmed" &&
    (isManualMappingSource(meta) || corroborating >= 2)
  ) {
    return "high";
  }

  if (
    isDebriefExtractionSource(meta) &&
    !validatedOnFile &&
    blob.trim()
  ) {
    return "medium";
  }

  if (input.validationStatus === "confirmed" && validatedOnFile) return "high";
  if (input.validationStatus === "confirmed" && isManualMappingSource(meta)) return "high";
  if (input.validationStatus === "confirmed" && corroborating >= 2) return "high";
  if (input.validationStatus === "confirmed") return "medium";

  return blob.trim() ? "medium" : "low";
}

export function resolveDiscoveryMappingSignalConfidence(input: {
  signalId: StageMappingSignalId;
  contact: Record<string, unknown>;
  resolved?: boolean;
  summary?: string | null;
}): DiscoveryMappingIntelligenceConfidenceLevel {
  const dbKeys = stageMappingRegistryDbKeys(input.signalId);
  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    input.contact.provider_intelligence_field_metadata,
  );
  const meta = resolveStageMappingSignalAttribution(input.signalId, input.contact);
  const validationStatus = inferStageMappingValidationStatus({
    meta,
    resolved: input.resolved,
  });

  const fieldSummary = dbKeys
    .map((key) => String(input.contact[key] ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const evidenceText =
    meta?.evidence_text?.trim() ||
    dbKeys.map((key) => fieldMeta[key]?.evidence_text?.trim()).find(Boolean) ||
    null;

  return resolveDiscoveryMappingIntelligenceConfidence({
    validationStatus,
    summary: input.summary ?? fieldSummary,
    evidenceText,
    meta,
    fieldMeta,
    dbKeys,
    resolved: input.resolved,
  });
}
