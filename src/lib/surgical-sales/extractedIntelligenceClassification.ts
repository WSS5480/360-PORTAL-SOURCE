/**
 * Pre-save extracted intelligence maturity — Referenced / Learning / Confirmed.
 * Planning prioritizes Confirmed intelligence over Learning and Referenced.
 */

import type { DebriefIntelligenceUpdateItem } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefExtractionSignalKind } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import type {
  DebriefClassifiedFact,
  DebriefFactClassification,
  DebriefIntelligenceCapturedItem,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import { textHasUncertaintyMarkers } from "@/lib/surgical-sales/intelligenceClassificationGuardrails";
import type { DebriefUniversalExtractedItem } from "@/lib/surgical-sales/debriefUniversalExtraction";
import type { ConfidenceLevel } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

export type ExtractedIntelligenceMaturity = "referenced" | "learning" | "confirmed";

export const EXTRACTED_INTELLIGENCE_MATURITY_LABELS: Record<ExtractedIntelligenceMaturity, string> = {
  referenced: "Referenced",
  learning: "Learning",
  confirmed: "Confirmed",
};

export const EXTRACTED_INTELLIGENCE_MATURITY_RANK: Record<ExtractedIntelligenceMaturity, number> = {
  referenced: 1,
  learning: 2,
  confirmed: 3,
};

const CONTACT_INFO_RE =
  /\b(?:@[a-z0-9.-]+\.[a-z]{2,}|\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]?\d{4}|direct line|extension)\b/i;

const LINKED_MARKERS =
  /\b(?:linked|on file|contact info captured|contact information captured|identified and linked)\b/i;

const IDENTIFIED_ROLE_MARKERS =
  /\b(?:coordinator identified|scheduler identified|handles scheduling|coordinates scheduling|scheduling coordinator|office coordinator)\b/i;

const VAGUE_EXISTENCE_MARKERS =
  /\b(?:scheduler exists|there is a scheduler|someone handles scheduling|scheduling exists|scheduler was mentioned)\b/i;

function combinedBlob(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function extractedIntelligenceMaturityLabel(
  maturity: ExtractedIntelligenceMaturity,
): string {
  return EXTRACTED_INTELLIGENCE_MATURITY_LABELS[maturity];
}

export function extractedIntelligenceMeetsPlanningThreshold(
  maturity: ExtractedIntelligenceMaturity,
): boolean {
  return maturity === "confirmed";
}

export function compareExtractedIntelligenceMaturity(
  a: ExtractedIntelligenceMaturity,
  b: ExtractedIntelligenceMaturity,
): number {
  return EXTRACTED_INTELLIGENCE_MATURITY_RANK[b] - EXTRACTED_INTELLIGENCE_MATURITY_RANK[a];
}

export type ClassifyExtractedIntelligenceInput = {
  text?: string;
  learned?: string;
  signalKind?: DebriefExtractionSignalKind;
  confidence?: ConfidenceLevel | "High" | "Medium" | "Low";
  requiresRepConfirmation?: boolean;
  fieldAccepted?: boolean;
  hasConflict?: boolean;
  contactDetailsMissing?: boolean;
  mentionLevel?: DebriefProposedContactItem["mentionLevel"];
  linkedContactId?: string | null;
  factKey?: string;
  classification?: DebriefFactClassification;
  namedPeople?: string[];
  dbKey?: string;
  observationApprovedExplicit?: boolean;
  credentialingPlatformConfirmed?: boolean;
};

function normalizeConfidence(
  confidence?: ConfidenceLevel | "High" | "Medium" | "Low",
): ConfidenceLevel {
  if (confidence === "High" || confidence === "high") return "high";
  if (confidence === "Low" || confidence === "low") return "low";
  return "medium";
}

function classifySchedulingFromBlob(blob: string, input: ClassifyExtractedIntelligenceInput): ExtractedIntelligenceMaturity | null {
  if (!/\b(?:schedul|coordinator|scheduler)\b/i.test(blob)) return null;

  if (
    LINKED_MARKERS.test(blob) &&
    (IDENTIFIED_ROLE_MARKERS.test(blob) || (input.namedPeople?.length ?? 0) > 0)
  ) {
    return "confirmed";
  }

  if (VAGUE_EXISTENCE_MARKERS.test(blob) || /\bscheduler exists\b/i.test(blob)) {
    return "referenced";
  }

  if (
    IDENTIFIED_ROLE_MARKERS.test(blob) ||
    ((input.namedPeople?.length ?? 0) > 0 && /\b(?:schedul|coordinator)\b/i.test(blob))
  ) {
    return "learning";
  }

  if (/\bscheduling coordinator identified\b/i.test(blob) && !LINKED_MARKERS.test(blob)) {
    return "learning";
  }

  if (/\bscheduler\b/i.test(blob) && !/\b[A-Z][a-z]{2,}\b/.test(blob)) {
    return "referenced";
  }

  return null;
}

/** Core classification — category-agnostic rules plus scheduling examples. */
export function classifyExtractedIntelligenceMaturity(
  input: ClassifyExtractedIntelligenceInput,
): ExtractedIntelligenceMaturity {
  const blob = combinedBlob([
    input.text,
    input.learned,
    input.namedPeople?.join(" "),
  ]);

  if (input.observationApprovedExplicit) {
    return "confirmed";
  }
  if (input.credentialingPlatformConfirmed) {
    return "confirmed";
  }

  if (input.linkedContactId) {
    return "confirmed";
  }

  if (
    input.mentionLevel === "confirmed_support_contact" &&
    !input.contactDetailsMissing &&
    (CONTACT_INFO_RE.test(blob) || Boolean(input.linkedContactId))
  ) {
    return "confirmed";
  }

  const schedulingMaturity = classifySchedulingFromBlob(blob, input);
  if (schedulingMaturity === "confirmed") return "confirmed";

  const confidence = normalizeConfidence(input.confidence);

  if (
    input.signalKind === "confirmed_fact" ||
    input.signalKind === "confirmed_contact" ||
    input.signalKind === "approval_signal"
  ) {
    if (
      input.fieldAccepted &&
      confidence === "high" &&
      !input.requiresRepConfirmation &&
      !input.hasConflict
    ) {
      return "confirmed";
    }
    return "learning";
  }

  if (input.factKey === "credentialing_platform_confirmed") {
    return "confirmed";
  }
  if (
    input.factKey === "scheduling_person_named" &&
    CONTACT_INFO_RE.test(blob)
  ) {
    return "confirmed";
  }
  if (input.factKey === "scheduling_discussed") {
    return schedulingMaturity ?? "referenced";
  }
  if (input.factKey === "scheduling_person_named") {
    return schedulingMaturity ?? "learning";
  }

  if (
    input.contactDetailsMissing &&
    (input.mentionLevel === "workflow_participant" ||
      input.mentionLevel === "potential_support_contact")
  ) {
    return "learning";
  }

  if (
    input.signalKind === "mentioned_person" ||
    input.signalKind === "unknown" ||
    input.mentionLevel === "mentioned_person"
  ) {
    return "referenced";
  }

  if (schedulingMaturity) return schedulingMaturity;

  if (confidence === "low" || textHasUncertaintyMarkers(blob)) {
    return "referenced";
  }

  if (
    input.fieldAccepted &&
    confidence === "high" &&
    !input.requiresRepConfirmation &&
    !input.hasConflict &&
    CONTACT_INFO_RE.test(blob)
  ) {
    return "confirmed";
  }

  if (
    input.signalKind === "interest_signal" ||
    input.signalKind === "inferred_signal" ||
    input.signalKind === "next_step" ||
    input.requiresRepConfirmation ||
    input.classification === "credentialing" ||
    confidence === "medium"
  ) {
    return "learning";
  }

  if (/\b(?:exists|mentioned|discussed|possible|might|maybe)\b/i.test(blob) && blob.length < 80) {
    return "referenced";
  }

  return "learning";
}

export function classifyProposedContactMaturity(
  contact: Pick<
    DebriefProposedContactItem,
    | "mentionLevel"
    | "contactDetailsMissing"
    | "displayName"
    | "roleLabel"
    | "sourceQuote"
    | "linkedContactId"
    | "email"
    | "phone"
    | "disposition"
  >,
): ExtractedIntelligenceMaturity {
  const linked =
    Boolean(contact.linkedContactId) ||
    contact.disposition === "link" ||
    contact.disposition === "accepted";
  return classifyExtractedIntelligenceMaturity({
    text: combinedBlob([
      contact.displayName,
      contact.roleLabel,
      contact.sourceQuote,
      contact.email,
      contact.phone,
    ]),
    mentionLevel: contact.mentionLevel,
    contactDetailsMissing: contact.contactDetailsMissing,
    linkedContactId: contact.linkedContactId,
    signalKind:
      contact.mentionLevel === "confirmed_support_contact"
        ? "confirmed_contact"
        : contact.mentionLevel === "workflow_participant" ||
            contact.mentionLevel === "potential_support_contact"
          ? "inferred_signal"
          : "mentioned_person",
    namedPeople: [contact.displayName],
    fieldAccepted: linked || (!contact.contactDetailsMissing && Boolean(contact.email || contact.phone)),
  });
}

export function classifyClassifiedFactMaturity(fact: DebriefClassifiedFact): ExtractedIntelligenceMaturity {
  return classifyExtractedIntelligenceMaturity({
    text: combinedBlob([fact.fact_text, fact.evidence_quote, fact.subject]),
    factKey: fact.fact_key,
    classification: fact.classification,
    namedPeople: fact.named_people,
    confidence: fact.confidence,
    signalKind:
      fact.fact_key.includes("confirmed") || fact.fact_key.includes("approved")
        ? "confirmed_fact"
        : fact.fact_key.includes("discussed") || fact.fact_key.includes("interest")
          ? "interest_signal"
          : fact.named_people.length > 0
            ? "inferred_signal"
            : "unknown",
    observationApprovedExplicit: fact.fact_key.includes("observation_approved"),
    credentialingPlatformConfirmed: fact.fact_key === "credentialing_platform_confirmed",
  });
}

export function classifyIntelligenceUpdateItemMaturity(
  item: Pick<
    DebriefIntelligenceUpdateItem,
    | "signalKind"
    | "confidenceLabel"
    | "requiresRepConfirmation"
    | "hasConflict"
    | "proposedValue"
    | "extractedStatement"
    | "evidenceQuote"
  > & {
    field: Pick<DebriefIntelligenceUpdateItem["field"], "accepted" | "dbKey">;
  },
): ExtractedIntelligenceMaturity {
  return classifyExtractedIntelligenceMaturity({
    text: combinedBlob([item.proposedValue, item.extractedStatement, item.evidenceQuote]),
    signalKind: item.signalKind,
    confidence: item.confidenceLabel,
    requiresRepConfirmation: item.requiresRepConfirmation,
    hasConflict: item.hasConflict,
    fieldAccepted: item.field.accepted,
    dbKey: item.field.dbKey,
  });
}

export function classifyUniversalExtractedItemMaturity(
  item: Pick<
    DebriefUniversalExtractedItem,
    "signalKind" | "confidence" | "requiresRepConfirmation" | "extractedValue" | "evidenceQuote"
  > & { fieldAccepted?: boolean; hasConflict?: boolean },
): ExtractedIntelligenceMaturity {
  return classifyExtractedIntelligenceMaturity({
    text: combinedBlob([item.extractedValue, item.evidenceQuote]),
    signalKind: item.signalKind,
    confidence: item.confidence,
    requiresRepConfirmation: item.requiresRepConfirmation,
    fieldAccepted: item.fieldAccepted,
    hasConflict: item.hasConflict,
  });
}

export function classifyCapturedItemMaturity(
  item: Pick<
    DebriefIntelligenceCapturedItem,
    "kind" | "learned" | "confidence" | "evidenceQuotes"
  >,
  context?: { observationApprovedExplicit?: boolean; credentialingPlatformConfirmed?: boolean },
): ExtractedIntelligenceMaturity {
  const signalKind: DebriefExtractionSignalKind =
    item.kind === "observation_access_status"
      ? context?.observationApprovedExplicit
        ? "approval_signal"
        : "interest_signal"
      : item.kind === "workflow_ownership"
        ? "inferred_signal"
        : item.kind === "clinical_focus"
          ? "confirmed_fact"
          : "inferred_signal";

  return classifyExtractedIntelligenceMaturity({
    text: combinedBlob([item.learned, ...item.evidenceQuotes]),
    learned: item.learned,
    signalKind,
    confidence: item.confidence,
    observationApprovedExplicit: context?.observationApprovedExplicit,
    credentialingPlatformConfirmed: context?.credentialingPlatformConfirmed,
  });
}

export function highestExtractedIntelligenceMaturity(
  maturities: ExtractedIntelligenceMaturity[],
): ExtractedIntelligenceMaturity {
  if (maturities.length === 0) return "referenced";
  return maturities.reduce((best, current) =>
    EXTRACTED_INTELLIGENCE_MATURITY_RANK[current] > EXTRACTED_INTELLIGENCE_MATURITY_RANK[best]
      ? current
      : best,
  );
}

export function maturityPriorityBoost(maturity: ExtractedIntelligenceMaturity): number {
  switch (maturity) {
    case "confirmed":
      return 0;
    case "learning":
      return 12;
    default:
      return 24;
  }
}
