/**
 * Stage mapping — question-type-specific answer models.
 */

import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  discoveryMappingScanFromEvidenceConfidence,
  type DiscoveryMappingEvidenceConfidence,
} from "@/lib/surgical-sales/discoveryMappingEvidenceConfidence";

/** Legacy four-choice model — kept for backward compatibility in persistence mappers. */
export type StageMappingLegacyChoice = "confirmed" | "partial" | "unknown" | "declined";

export type StageMappingQuestionType =
  | "approval"
  | "ownership"
  | "champion"
  | "workflow"
  | "product_fit"
  | "opportunity"
  | "timing"
  | "pathway";

export type StageMappingChoiceTone = "positive" | "partial" | "neutral" | "negative" | "action";

export type StageMappingChoiceSpec = {
  value: string;
  label: string;
  tone: StageMappingChoiceTone;
  /** Opens inline contact panel instead of saving immediately. */
  opensContactPanel?: boolean;
  contactMode?: "select" | "create";
};

export type StageMappingExpectationLevel = "required_now" | "helpful" | "later_stage";

export type StageMappingMetadataField = {
  key: string;
  label: string;
  type: "text" | "date" | "select" | "textarea";
  placeholder?: string;
  optional?: boolean;
  options?: { value: string; label: string }[];
};

export type StageMappingSignalSpec = {
  questionType: StageMappingQuestionType;
  expectationLevel: StageMappingExpectationLevel;
  expectationHelper: string;
  structuredForm?: "facility_credentialing" | "scheduling_ownership";
  choices: StageMappingChoiceSpec[];
  metadataFields?: StageMappingMetadataField[];
  supportsInlineContact?: boolean;
  notesPlaceholder?: string;
  contactPanelTitle?: string;
  contactPanelHint?: string;
};

export type StageMappingAnswerPayload = {
  choice: string;
  notes?: string;
  metadata?: Record<string, string>;
  /** @deprecated Use evidenceConfidence */
  validationStatus?: StageMappingValidationStatus;
  evidenceConfidence?: import("@/lib/surgical-sales/discoveryMappingEvidenceConfidence").DiscoveryMappingEvidenceConfidence;
  evidenceText?: string;
};

export type StageMappingValidationStatus =
  | "confirmed"
  | "likely"
  | "needs_validation"
  | "unknown";

export const STAGE_MAPPING_VALIDATION_LABELS: Record<StageMappingValidationStatus, string> = {
  confirmed: "Confirmed",
  likely: "Likely",
  needs_validation: "Needs validation",
  unknown: "Unknown",
};

/** Rapid-scan badge — derived from evidence confidence when provided. */
export function discoveryMappingScanStatus(input: {
  validationStatus?: StageMappingValidationStatus;
  evidenceConfidence?: DiscoveryMappingEvidenceConfidence;
  resolved?: boolean;
  hasAppliedIntelligence?: boolean;
  scanStatus?: { label: string; slug: string } | null;
}): { label: string; slug: "open" | "potential_lead" | "partial" | "confirmed" | "unknown" } {
  if (input.evidenceConfidence) {
    return discoveryMappingScanFromEvidenceConfidence(input.evidenceConfidence);
  }

  if (input.scanStatus?.slug) {
    const slug = input.scanStatus.slug as
      | "open"
      | "potential_lead"
      | "partial"
      | "confirmed"
      | "unknown";
    return { label: input.scanStatus.label, slug };
  }

  if (input.hasAppliedIntelligence && input.validationStatus && input.validationStatus !== "confirmed") {
    return { label: "Partial", slug: "partial" };
  }

  const isPartialApplied =
    input.hasAppliedIntelligence &&
    (input.validationStatus === "needs_validation" || input.validationStatus === "likely");

  if (input.resolved && input.validationStatus === "confirmed" && input.hasAppliedIntelligence) {
    return { label: "Confirmed", slug: "confirmed" };
  }
  if (
    input.validationStatus === "needs_validation" ||
    input.validationStatus === "likely" ||
    isPartialApplied
  ) {
    return { label: "Partial", slug: "partial" };
  }
  if (input.validationStatus === "confirmed" && input.hasAppliedIntelligence) {
    return { label: "Confirmed", slug: "confirmed" };
  }
  return { label: "Open", slug: "open" };
}

export function stageMappingChoiceSpec(
  spec: StageMappingSignalSpec,
  choice: string,
): StageMappingChoiceSpec | undefined {
  return spec.choices.find((c) => c.value === choice);
}

export function stageMappingChoiceRequiresContact(
  spec: StageMappingSignalSpec,
  choice: string,
): boolean {
  const entry = stageMappingChoiceSpec(spec, choice);
  return Boolean(entry?.opensContactPanel && spec.supportsInlineContact);
}

/** Inline contact is optional after the primary answer (Yes → panel, No → confirm without contact). */
export function stageMappingOffersOptionalContact(spec: StageMappingSignalSpec): boolean {
  if (!spec.supportsInlineContact) return false;
  if (spec.structuredForm === "scheduling_ownership") return false;
  return true;
}

export function stageMappingChoiceTone(
  spec: StageMappingSignalSpec,
  choice: string,
): StageMappingChoiceTone {
  return stageMappingChoiceSpec(spec, choice)?.tone ?? "neutral";
}

/** Map contextual choice tone → legacy bucket for workflow + stance helpers. */
export function stageMappingChoiceToLegacy(choice: string, tone: StageMappingChoiceTone): StageMappingLegacyChoice {
  if (tone === "positive") return "confirmed";
  if (tone === "partial" || tone === "action") return "partial";
  if (tone === "negative") return "declined";
  return "unknown";
}

export type StageMappingSignalId = DiscoveryStructuredSignalId;

export const STAGE_MAPPING_EXPECTATION_ORDER: StageMappingExpectationLevel[] = [
  "required_now",
  "helpful",
  "later_stage",
];

export function stageMappingExpectationSortKey(level: StageMappingExpectationLevel): number {
  return STAGE_MAPPING_EXPECTATION_ORDER.indexOf(level);
}
