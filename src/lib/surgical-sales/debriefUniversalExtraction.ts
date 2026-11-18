/**
 * Style-agnostic debrief intelligence extraction — universal guardrails for any rep dictation.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { fieldLabelForDbKey } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  recommendedUpdateDetail,
  recommendedUpdateHeadline,
} from "@/lib/surgical-sales/logUpdateReviewPresentation";
import { reviewFieldBucket } from "@/lib/surgical-sales/logUpdateReviewSelection";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  textHasUncertaintyMarkers,
  textIsRepOpenNeed,
  textStatesAbsenceAsFact,
} from "@/lib/surgical-sales/intelligenceClassificationGuardrails";
import type { ConfidenceLevel, IntelligenceDomain } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { DEBRIEF_CONTACT_REQUIRES_DECISION } from "@/lib/surgical-sales/debriefApprovalUx";
import {
  classifyDebriefIntelligenceCategories,
  debriefExplicitProductFitConnection,
  resolveProductFitSignalConfidence,
  type DebriefExtractionSignalKind,
  type DebriefIntelligenceCategory,
} from "@/lib/surgical-sales/debriefIntelligenceCategories";
import {
  debriefExplicitlyApprovesObservation,
  debriefIndicatesObservationInterest,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import {
  debriefConfidenceFromStructured,
  mergeDebriefConfidence,
  scoreConfidenceFromEvidence,
  scorePersonMentionConfidenceFromLevel,
  shouldPreselectDebriefFinding,
  toStructuredConfidence,
} from "@/lib/surgical-sales/debriefIntelligenceConfidence";

export type { DebriefIntelligenceCategory, DebriefExtractionSignalKind } from "@/lib/surgical-sales/debriefIntelligenceCategories";
export {
  DEBRIEF_INTELLIGENCE_CATEGORIES,
  DEBRIEF_INTELLIGENCE_CATEGORY_LABELS,
  DEBRIEF_INTELLIGENCE_CATEGORY_DESCRIPTIONS,
  intelligenceCategoryLabel,
  formatIntelligenceCategoryTags,
} from "@/lib/surgical-sales/debriefIntelligenceCategories";

/** @deprecated Use DebriefIntelligenceCategory — legacy semantic tags for guardrails only. */
export type DebriefExtractionCategory = DebriefExtractionSignalKind;

export const DEBRIEF_EXTRACTION_CATEGORIES = [
  "confirmed_fact",
  "inferred_signal",
  "interest_signal",
  "approval_signal",
  "mentioned_person",
  "confirmed_contact",
  "pain_point",
  "product_interest",
  "next_step",
  "completed_action",
  "unknown",
] as const;

export type DebriefExtractedConfidence = ConfidenceLevel;

export type DebriefUniversalExtractedItem = {
  id: string;
  extractedValue: string;
  confidence: DebriefExtractedConfidence;
  confidenceLabel: "High" | "Medium" | "Low";
  evidenceQuote: string;
  primaryCategory: DebriefIntelligenceCategory;
  secondaryCategories: DebriefIntelligenceCategory[];
  /** Extraction semantics (confirmed vs interest vs next step) — not the intelligence category. */
  signalKind: DebriefExtractionSignalKind;
  /** @deprecated Use primaryCategory */
  category: DebriefExtractionSignalKind;
  suggestedUpdate: string;
  requiresRepConfirmation: boolean;
  fieldUpdateId?: string;
  discoverySignalId?: DiscoveryStructuredSignalId | null;
};

const APPROVAL_MARKERS =
  /\b(?:approved?|approval|open to|not opposed|willing to|signed off|cleared?|green\s*light|feasible|will allow|can observe|observation\s+(?:is\s+)?(?:ok|fine|possible))\b/i;

const INTEREST_ONLY_MARKERS =
  /\b(?:interested|curious|intrigued|wants? to learn|sounded? interested|might fit|could fit|worth exploring|positive reaction)\b/i;

const PAIN_MARKERS =
  /\b(?:frustrat\w*|pain\s*points?|challenges?|problems?|inefficien\w*|difficult\w*|struggl\w*|complaints?|dissatisf\w*|bottlenecks?|delays?)\b/i;

const PRODUCT_MARKERS =
  /\b(?:ACSIS|our\s+product|product\s+(?:fit|eval|trial)|evaluation|trial|solution)\b/i;

const NEXT_STEP_MARKERS =
  /\b(?:need to|should|follow[- ]?up|next step|plan to|will (?:call|email|schedule|reach)|going to|want to|have to|still need|get (?:her|his|their|the) info)\b/i;

const COMPLETED_MARKERS =
  /\b(?:already|completed|finished|scheduled|booked|sent|called|met with|confirmed the|got (?:her|his|their)|captured|logged|saved|debriefed)\b/i;

const CONFIRMED_CONTACT_MARKERS =
  /\b(?:@[a-z0-9.-]+\.[a-z]{2,}|\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]\d{4}|email|phone|extension|direct line)\b/i;

export function debriefConfidenceDisplayLabel(
  confidence: DebriefExtractedConfidence,
): "High" | "Medium" | "Low" {
  switch (confidence) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}

export function requiresRepConfirmationForExtraction(input: {
  confidence: DebriefExtractedConfidence;
  signalKind: DebriefExtractionSignalKind;
  hasConflict?: boolean;
}): boolean {
  if (input.hasConflict) return true;
  if (input.confidence === "low") return true;
  if (input.signalKind === "unknown" || input.signalKind === "inferred_signal") return true;
  if (input.signalKind === "mentioned_person") return true;
  if (input.signalKind === "interest_signal") return true;
  if (input.signalKind === "next_step") return true;
  if (input.confidence === "medium") {
    return (
      input.signalKind !== "confirmed_fact" &&
      input.signalKind !== "approval_signal" &&
      input.signalKind !== "confirmed_contact"
    );
  }
  return false;
}

export function canAutoApplyExtractedItem(
  item: Pick<
    DebriefUniversalExtractedItem,
    "confidence" | "requiresRepConfirmation" | "signalKind" | "category"
  >,
): boolean {
  const kind = item.signalKind ?? item.category;
  if (!shouldPreselectDebriefFinding(debriefConfidenceFromStructured(item.confidence))) {
    return false;
  }
  if (item.requiresRepConfirmation) return false;
  if (kind === "unknown" || kind === "mentioned_person" || kind === "inferred_signal") {
    return false;
  }
  if (kind === "interest_signal" || kind === "next_step") return false;
  return item.confidence === "high" || item.confidence === "medium";
}

function combinedBlob(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function classifyExtractionSignalKind(input: {
  domain?: IntelligenceDomain | null;
  label: string;
  value: string;
  evidence?: string;
  confidence?: ConfidenceLevel;
  isPartial?: boolean;
  isStillToValidate?: boolean;
  isContact?: boolean;
  contactDetailsMissing?: boolean;
  mentionLevel?: "mentioned_person" | "workflow_participant" | "potential_support_contact" | "confirmed_support_contact";
}): DebriefExtractionSignalKind {
  const blob = combinedBlob([input.label, input.value, input.evidence]);

  if (input.isStillToValidate) {
    return "unknown";
  }

  if (input.isContact) {
    if (input.mentionLevel === "confirmed_support_contact") {
      return "confirmed_contact";
    }
    if (
      input.mentionLevel === "workflow_participant" ||
      input.mentionLevel === "potential_support_contact"
    ) {
      return "mentioned_person";
    }
    if (!input.contactDetailsMissing && CONFIRMED_CONTACT_MARKERS.test(blob)) {
      return "confirmed_contact";
    }
    return "mentioned_person";
  }

  if (input.domain === "next_steps" || (NEXT_STEP_MARKERS.test(blob) && !COMPLETED_MARKERS.test(blob))) {
    return "next_step";
  }

  if (COMPLETED_MARKERS.test(blob) && !NEXT_STEP_MARKERS.test(blob)) {
    return "completed_action";
  }

  if (debriefExplicitProductFitConnection(blob)) {
    if (
      input.domain === "product_fit" ||
      input.domain === "evaluation" ||
      INTEREST_ONLY_MARKERS.test(blob) ||
      PRODUCT_MARKERS.test(blob)
    ) {
      return "product_interest";
    }
  }

  if (PAIN_MARKERS.test(blob)) {
    return "pain_point";
  }

  if (input.domain === "or_access" || /\bobservation\b/i.test(blob)) {
    if (debriefExplicitlyApprovesObservation(blob)) {
      return input.isPartial || input.confidence !== "high" ? "interest_signal" : "approval_signal";
    }
    if (debriefIndicatesObservationInterest(blob) || INTEREST_ONLY_MARKERS.test(blob)) {
      return "interest_signal";
    }
    if (APPROVAL_MARKERS.test(blob)) {
      return "interest_signal";
    }
  }

  if (INTEREST_ONLY_MARKERS.test(blob) && !APPROVAL_MARKERS.test(blob)) {
    return "interest_signal";
  }

  if (textIsRepOpenNeed(blob) || (textStatesAbsenceAsFact(blob) && !AFFIRMATIVE_FACT_IN_CLASSIFY.test(blob))) {
    return "unknown";
  }

  if (input.isPartial || input.confidence === "low" || input.confidence === "medium") {
    return "inferred_signal";
  }

  return "confirmed_fact";
}

/** @deprecated Use classifyExtractionSignalKind */
export function classifyExtractionCategory(
  input: Parameters<typeof classifyExtractionSignalKind>[0],
): DebriefExtractionSignalKind {
  return classifyExtractionSignalKind(input);
}

const AFFIRMATIVE_FACT_IN_CLASSIFY =
  /\b(?:confirmed|requires|must|will not approve|approves|approved|goes through|is required|named contact|contact is|coordinator is)\b/i;

function buildCategoryFields(input: {
  domain?: IntelligenceDomain | null;
  label: string;
  value: string;
  evidence?: string;
  signalKind: DebriefExtractionSignalKind;
  isContact?: boolean;
  mentionLevel?: "mentioned_person" | "workflow_participant" | "potential_support_contact" | "confirmed_support_contact";
  schedulingContact?: boolean;
}): Pick<DebriefUniversalExtractedItem, "primaryCategory" | "secondaryCategories" | "signalKind" | "category"> {
  const { primaryCategory, secondaryCategories } = classifyDebriefIntelligenceCategories(input);
  return {
    primaryCategory,
    secondaryCategories,
    signalKind: input.signalKind,
    category: input.signalKind,
  };
}

function sourceQuoteFromOperationalSignals(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): string | null {
  const ai = review.aiMapping;
  if (!ai?.operational_signals?.length) return null;

  const confirmedIdx = field.id.match(/^ai-confirmed-(\d+)$/)?.[1];
  const partialIdx = field.id.match(/^ai-partial-(\d+)$/)?.[1];
  const row =
    confirmedIdx != null
      ? ai.confirmed_updates[Number(confirmedIdx)]
      : partialIdx != null
        ? ai.partial_updates[Number(partialIdx)]
        : null;
  const domain = row?.domain;

  const signals = ai.operational_signals;
  const match =
    (domain ? signals.find((s) => s.domain === domain) : null) ??
    signals.find((s) => s.signal.toLowerCase().includes(field.label.toLowerCase().slice(0, 12)));
  const evidence = match?.evidence?.trim();
  if (evidence && evidence.length > 8) return evidence.slice(0, 400);
  return null;
}

function resolveConfidenceForField(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): DebriefExtractedConfidence {
  const ai = review.aiMapping;
  const atomicFacts = review.atomicFacts ?? [];

  if (!ai && atomicFacts.length > 0) {
    const evidence = evidenceQuoteForField(field, review);
    const matched = atomicFacts.find(
      (fact) =>
        fact.evidence === evidence ||
        evidence.includes(fact.evidence) ||
        fact.evidence.includes(evidence.slice(0, Math.min(32, evidence.length))),
    );
    if (matched) return matched.confidence;
    if (field.accepted) return "high";
    const blob = `${field.label} ${field.proposedValue} ${evidence}`;
    if (textHasUncertaintyMarkers(blob)) return "low";
    return toStructuredConfidence(scoreConfidenceFromEvidence(blob));
  }

  if (!ai) return "medium";

  const confirmed = ai.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`);
  if (confirmed) return confirmed.confidence;

  const partial = ai.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  if (partial) return partial.confidence === "high" ? "medium" : partial.confidence;

  const blob = `${field.label} ${field.proposedValue} ${evidenceQuoteForField(field, review)}`;
  if (textHasUncertaintyMarkers(blob)) return "low";
  if (reviewFieldBucket(field, ai) === "recommended") return "high";
  return "medium";
}

function evidenceQuoteForField(field: LogUpdateRoutedFieldUpdate, review: LogUpdateParseResult): string {
  const atomicFacts = review.atomicFacts ?? [];
  if (atomicFacts.length > 0) {
    const valueMatch = atomicFacts.find(
      (f) =>
        field.proposedValue.trim().includes(f.value.trim()) ||
        f.value.trim().includes(field.proposedValue.trim().slice(0, 24)),
    );
    if (valueMatch?.evidence.trim()) return valueMatch.evidence.trim().slice(0, 400);

    const evidenceMatch = atomicFacts.find((f) =>
      field.proposedValue.toLowerCase().includes(f.evidence.toLowerCase().slice(0, 32)),
    );
    if (evidenceMatch?.evidence.trim()) return evidenceMatch.evidence.trim().slice(0, 400);
  }

  const fromSignal = sourceQuoteFromOperationalSignals(field, review);
  if (fromSignal?.trim()) return fromSignal.trim().slice(0, 400);

  const ai = review.aiMapping;
  if (ai) {
    const confirmedIdx = field.id.match(/^ai-confirmed-(\d+)$/)?.[1];
    if (confirmedIdx != null) {
      const row = ai.confirmed_updates[Number(confirmedIdx)];
      const quote = row?.reasoning?.match(/Source quote:\s*"([^"]+)"/i)?.[1];
      if (quote?.trim()) return quote.trim().slice(0, 400);
    }
    const partialIdx = field.id.match(/^ai-partial-(\d+)$/)?.[1];
    if (partialIdx != null) {
      const row = ai.partial_updates[Number(partialIdx)];
      const quote = row?.reasoning?.match(/Source quote:\s*"([^"]+)"/i)?.[1];
      if (quote?.trim()) return quote.trim().slice(0, 400);
    }
  }

  const value = field.proposedValue.trim();
  if (value.length > 12 && !textStatesAbsenceAsFact(value)) return value.slice(0, 400);
  return "";
}

function domainForFieldId(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): IntelligenceDomain | null {
  const ai = review.aiMapping;
  if (!ai) return null;
  const confirmed = ai.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`);
  if (confirmed) return confirmed.domain;
  const partial = ai.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  return partial?.domain ?? null;
}

function suggestedUpdateForField(field: LogUpdateRoutedFieldUpdate): string {
  const headline = recommendedUpdateHeadline(field);
  const detail = recommendedUpdateDetail(field, null);
  if (detail && detail !== headline) return `${headline} — ${detail}`;
  return headline || fieldLabelForDbKey(field.dbKey);
}

export function buildFieldUniversalExtractedItem(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
  options?: { discoverySignalId?: DiscoveryStructuredSignalId | null },
): DebriefUniversalExtractedItem {
  let confidence = resolveConfidenceForField(field, review);
  const evidenceQuote = evidenceQuoteForField(field, review);
  const domain = domainForFieldId(field, review);
  const isPartial = field.id.startsWith("ai-partial-");
  const signalKind = classifyExtractionSignalKind({
    domain,
    label: field.label,
    value: field.proposedValue,
    evidence: evidenceQuote,
    confidence,
    isPartial,
  });
  const categories = buildCategoryFields({
    domain,
    label: field.label,
    value: field.proposedValue,
    evidence: evidenceQuote,
    signalKind,
  });

  const classificationBlob = combinedBlob([field.label, field.proposedValue, evidenceQuote]);
  if (categories.primaryCategory === "product_fit_signals") {
    confidence = resolveProductFitSignalConfidence(classificationBlob);
  }

  const requiresRepConfirmation = requiresRepConfirmationForExtraction({
    confidence,
    signalKind,
    hasConflict: Boolean(field.conflict && !field.conflict.resolution),
  });

  return {
    id: field.id,
    extractedValue: field.proposedValue.trim(),
    confidence,
    confidenceLabel: debriefConfidenceDisplayLabel(confidence),
    evidenceQuote,
    ...categories,
    suggestedUpdate: suggestedUpdateForField(field),
    requiresRepConfirmation,
    fieldUpdateId: field.id,
    discoverySignalId: options?.discoverySignalId ?? null,
  };
}

export function buildContactUniversalExtractedItem(
  contact: DebriefProposedContactItem,
): DebriefUniversalExtractedItem {
  const evidenceQuote = (contact.sourceQuote ?? contact.displayName).trim().slice(0, 400);
  const confidence = toStructuredConfidence(
    scorePersonMentionConfidenceFromLevel({
      name: contact.displayName,
      quote: contact.sourceQuote ?? "",
      mentionLevel: contact.mentionLevel,
    }),
  );
  const schedulingContact =
    contact.workflowResponsibilityId === "observation_scheduling_owner" || /\bschedul/i.test(contact.roleLabel);
  const signalKind = classifyExtractionSignalKind({
    label: contact.roleLabel,
    value: contact.displayName,
    evidence: evidenceQuote,
    confidence,
    isContact: true,
    contactDetailsMissing: contact.contactDetailsMissing,
    mentionLevel: contact.mentionLevel,
  });
  const categories = buildCategoryFields({
    label: contact.roleLabel,
    value: contact.displayName,
    evidence: evidenceQuote,
    signalKind,
    isContact: true,
    mentionLevel: contact.mentionLevel,
    schedulingContact,
  });

  const levelLabel =
    contact.mentionLevel === "confirmed_support_contact"
      ? "Confirmed support contact"
      : contact.mentionLevel === "workflow_participant"
        ? "Workflow participant"
        : "Potential support contact";

  return {
    id: contact.id,
    extractedValue: contact.displayName,
    confidence,
    confidenceLabel: debriefConfidenceDisplayLabel(confidence),
    evidenceQuote,
    ...categories,
    suggestedUpdate: contact.contactDetailsMissing
      ? contact.mentionLevel === "workflow_participant"
        ? `${contact.displayName} — ${DEBRIEF_CONTACT_REQUIRES_DECISION.toLowerCase()}`
        : `${levelLabel}: ${contact.displayName} — contact info needed`
      : `${levelLabel}: add ${contact.displayName} as support contact`,
    requiresRepConfirmation: true,
    discoverySignalId: contact.discoverySignalId,
  };
}

export function buildPlatformUniversalExtractedItem(
  platform: DebriefPlatformMatchInput,
): DebriefUniversalExtractedItem {
  const confidence: DebriefExtractedConfidence =
    platform.confidenceTier === "high_confidence"
      ? "high"
      : platform.confidenceTier === "needs_review"
        ? "medium"
        : "low";

  const signalKind: DebriefExtractionSignalKind =
    confidence === "high" && platform.matchedPlatformId ? "confirmed_fact" : "inferred_signal";

  const categories = buildCategoryFields({
    domain: "credentialing",
    label: "Credentialing platform",
    value: platform.matchedPlatformName ?? platform.mentionedName,
    evidence: platform.sourceQuote ?? platform.mentionedName,
    signalKind,
  });

  return {
    id: platform.id,
    extractedValue: platform.mentionedName,
    confidence,
    confidenceLabel: debriefConfidenceDisplayLabel(confidence),
    evidenceQuote: (platform.sourceQuote ?? platform.mentionedName).slice(0, 400),
    ...categories,
    suggestedUpdate: platform.matchedPlatformName
      ? `Link credentialing platform: ${platform.matchedPlatformName}`
      : `Confirm credentialing platform: ${platform.mentionedName}`,
    requiresRepConfirmation: requiresRepConfirmationForExtraction({ confidence, signalKind }),
  };
}

export function buildUnknownUniversalExtractedItems(
  review: LogUpdateParseResult,
): DebriefUniversalExtractedItem[] {
  const questions = [
    ...(review.aiMapping?.still_to_validate.map((q) => q.question.trim()) ?? []),
    ...review.intelligenceReview.stillWorthConfirming,
  ];

  return [...new Set(questions.map((q) => q.trim()).filter(Boolean))].slice(0, 8).map((question, i) => {
    const signalKind = "unknown" as const;
    const categories = buildCategoryFields({
      domain: "next_steps",
      label: "Unresolved",
      value: question,
      evidence: question,
      signalKind,
    });
    return {
      id: `unknown-${i}`,
      extractedValue: question,
      confidence: "low" as const,
      confidenceLabel: "Low" as const,
      evidenceQuote: "",
      ...categories,
      suggestedUpdate: "Confirm with provider before saving as intelligence",
      requiresRepConfirmation: true,
    };
  });
}

export type DebriefPlatformMatchInput = {
  id: string;
  mentionedName: string;
  matchedPlatformId: string | null;
  matchedPlatformName: string | null;
  confidenceTier: "high_confidence" | "needs_review" | "ambiguous";
  sourceQuote: string | null;
};

export function buildUniversalExtractionItems(input: {
  review: LogUpdateParseResult;
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
  proposedContacts?: DebriefProposedContactItem[];
  platformMatches?: DebriefPlatformMatchInput[];
  signalIdForField?: (field: LogUpdateRoutedFieldUpdate) => DiscoveryStructuredSignalId | null;
}): DebriefUniversalExtractedItem[] {
  const fields = input.review.usesProviderIntelligence ? input.review.fieldUpdates : [];
  const fieldItems = fields.map((field) =>
    buildFieldUniversalExtractedItem(field, input.review, {
      discoverySignalId: input.signalIdForField?.(field) ?? null,
    }),
  );

  const contacts = (input.proposedContacts ?? []).map(buildContactUniversalExtractedItem);
  const platforms = (input.platformMatches ?? []).map(buildPlatformUniversalExtractedItem);
  const unknowns = buildUnknownUniversalExtractedItems(input.review);

  return [...fieldItems, ...contacts, ...platforms, ...unknowns];
}
