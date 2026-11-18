/**
 * Discovery Mapping — evidence quality gates for scan status and confirmed state.
 */

import { textSuggestsInferredIntelligence } from "@/lib/surgical-sales/discoveryMappingIntelligenceConfidence";
import type { DiscoveryMappingIntelligenceConfidenceLevel } from "@/lib/surgical-sales/discoveryMappingIntelligenceConfidence";
import {
  isHumanReadableDiscoveryEvidence,
  isIntelligenceCaptureTokenValue,
} from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import { isGenericIntelligenceSummary } from "@/lib/surgical-sales/propagatedIntelligenceSignal";
import type { StageMappingValidationStatus } from "@/lib/surgical-sales/stageMappingAnswerTypes";
import { isManualMappingSource, isDebriefExtractionSource } from "@/lib/surgical-sales/stageMappingSourceAttribution";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

export type DiscoveryMappingEvidenceStrength = "none" | "weak" | "partial" | "substantive";

export type DiscoveryMappingScanStatusSlug = "open" | "potential_lead" | "partial" | "confirmed";

export const DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY =
  "No intelligence captured yet.";

const PLACEHOLDER_ANSWER_RE =
  /^(?:captured intelligence|captured|on file|unknown|not discussed|not yet|n\/a|na|tbd|pending|partial|validated|confirmed|no validated answer yet|nothing captured yet(?: for this signal)?)\.?$/i;

const PARTIAL_LEAD_RE = /\[Partial lead\]/i;

function normalizeEvidenceText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function normalizeQuestionText(text: string): string {
  return text.trim().replace(/\?$/, "").replace(/\s+/g, " ").toLowerCase();
}

export function isPlaceholderDiscoveryMappingAnswer(
  text: string | null | undefined,
  questionText?: string | null,
): boolean {
  const trimmed = normalizeEvidenceText(String(text ?? ""));
  if (!trimmed) return true;
  if (PLACEHOLDER_ANSWER_RE.test(trimmed)) return true;
  if (isIntelligenceCaptureTokenValue(trimmed)) return true;
  if (isGenericIntelligenceSummary(trimmed)) return true;

  const question = normalizeQuestionText(String(questionText ?? ""));
  const candidate = normalizeQuestionText(trimmed.replace(/\?$/, ""));
  if (question && candidate === question) return true;
  if (question && candidate.startsWith(question) && trimmed.length <= question.length + 8) {
    return true;
  }

  return false;
}

export function isDiscoveryMappingValidatedOnFile(input: {
  dbKeys: string[];
  contact: Record<string, unknown>;
}): boolean {
  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    input.contact.provider_intelligence_field_metadata,
  );

  return input.dbKeys.some((dbKey) => {
    const raw = String(input.contact[dbKey] ?? "").trim();
    if (!isHumanReadableDiscoveryEvidence(raw)) return false;
    if (!isIntelligenceFieldValidatedOnFile(dbKey, input.contact)) return false;

    const meta = fieldMeta[dbKey];
    if (!meta) return false;
    if (isDebriefExtractionSource(meta)) return false;
    if (meta.discovery_stance === "needs_validation") return false;
    if (isManualMappingSource(meta)) return true;

    return meta.lifecycle_state === "validated" && Boolean(meta.validated_at);
  });
}

export function assessDiscoveryMappingEvidence(input: {
  summary?: string | null;
  evidenceText?: string | null;
  fieldValues?: string[];
  questionText?: string | null;
  hasPartialLead?: boolean;
}): DiscoveryMappingEvidenceStrength {
  const candidates = [
    input.summary,
    input.evidenceText,
    ...(input.fieldValues ?? []),
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const readable = candidates.filter(
    (value) =>
      !isPlaceholderDiscoveryMappingAnswer(value, input.questionText) &&
      (isHumanReadableDiscoveryEvidence(value) ||
        (value.length >= 12 && !isIntelligenceCaptureTokenValue(value))),
  );

  if (!readable.length) {
    return input.hasPartialLead ? "weak" : "none";
  }

  const hasPartialLeadMarker = readable.some((value) => PARTIAL_LEAD_RE.test(value));
  const hasInferred = readable.some((value) => textSuggestsInferredIntelligence(value));
  const hasDirectFact = readable.some(
    (value) =>
      !PARTIAL_LEAD_RE.test(value) &&
      !textSuggestsInferredIntelligence(value) &&
      !isGenericIntelligenceSummary(value),
  );

  if (hasDirectFact && readable.length >= 2) return "substantive";
  if (hasDirectFact) return "partial";
  if (hasPartialLeadMarker || hasInferred || input.hasPartialLead) return "weak";
  return "partial";
}

export function resolveDiscoveryMappingScanStatus(input: {
  validationStatus: StageMappingValidationStatus;
  evidenceStrength: DiscoveryMappingEvidenceStrength;
  confidenceLevel?: DiscoveryMappingIntelligenceConfidenceLevel;
  validatedOnFile?: boolean;
  resolved?: boolean;
  manualMappingConfirmed?: boolean;
}): { label: string; slug: DiscoveryMappingScanStatusSlug } {
  const { evidenceStrength, confidenceLevel = "low", validatedOnFile = false } = input;

  if (evidenceStrength === "none") {
    return { label: "Open", slug: "open" };
  }

  const canConfirm =
    validatedOnFile &&
    input.validationStatus === "confirmed" &&
    (evidenceStrength === "substantive" || evidenceStrength === "partial");

  if (canConfirm) {
    return { label: "Confirmed", slug: "confirmed" };
  }

  if (evidenceStrength === "weak") {
    return { label: "Potential Lead", slug: "potential_lead" };
  }

  if (
    evidenceStrength === "partial" ||
    input.validationStatus === "needs_validation" ||
    input.validationStatus === "likely"
  ) {
    return { label: "Partial", slug: "partial" };
  }

  return { label: "Partial", slug: "partial" };
}

export function inferDiscoveryMappingValidationStatus(input: {
  meta?: import("@/lib/surgical-sales/providerIntelligenceFieldMetadata").IntelligenceFieldAttribution | null;
  resolved?: boolean;
  explicitStatus?: StageMappingValidationStatus | null;
  evidenceStrength: DiscoveryMappingEvidenceStrength;
  validatedOnFile?: boolean;
}): StageMappingValidationStatus {
  if (input.explicitStatus) return input.explicitStatus;

  if (input.evidenceStrength === "none") return "unknown";

  if (
    input.validatedOnFile &&
    (input.evidenceStrength === "substantive" || input.evidenceStrength === "partial")
  ) {
    return "confirmed";
  }

  const stance = input.meta?.discovery_stance;
  if (stance === "needs_validation") return "needs_validation";
  if (stance === "ask_next_touch") return "likely";
  if (stance === "unknown") return "unknown";

  if (
    isManualMappingSource(input.meta) &&
    input.resolved &&
    input.evidenceStrength === "substantive"
  ) {
    return "confirmed";
  }

  if (input.evidenceStrength === "weak") return "likely";
  if (input.evidenceStrength === "partial" || input.evidenceStrength === "substantive") {
    return "needs_validation";
  }

  return "unknown";
}
