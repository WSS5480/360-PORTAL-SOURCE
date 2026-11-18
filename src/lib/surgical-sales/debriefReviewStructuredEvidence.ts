/**
 * Concise structured evidence for debrief review cards — no AI paragraph dumps.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { DebriefIntelligenceUpdateItem } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { sourceQuoteForField } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { OperationalSignal } from "@/lib/surgical-sales/operationalIntelligenceTypes";
import type { OperationalReviewTopicId } from "@/lib/surgical-sales/mergeDebriefOperationalReview";
import { PARTIAL_INTELLIGENCE_LEAD_PREFIX } from "@/lib/surgical-sales/partialIntelligencePersist";
import { sanitizeOperationalUserText } from "@/lib/surgical-sales/operationalIntelligenceEngine";

export type DebriefStructuredEvidence = {
  sourceQuote: string | null;
  confidenceLabel: string | null;
  reasoning: string | null;
};

export const DEBRIEF_REVIEW_VIEW_EVIDENCE = "View evidence";
export const DEBRIEF_REVIEW_HIDE_EVIDENCE = "Hide evidence";

const MAX_SOURCE_QUOTE = 160;
const MAX_REASONING = 160;

function stripAiBlob(raw: string): string {
  let text = String(raw ?? "").trim();
  if (!text) return "";
  text = text.replace(new RegExp(PARTIAL_INTELLIGENCE_LEAD_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
  const stillIdx = text.search(/Still needed:/i);
  if (stillIdx >= 0) text = text.slice(0, stillIdx).trim();
  text = text.replace(/^What happened:\s*/i, "").trim();
  text = text.replace(/Source quote:\s*"[^"]*"\s*/gi, "").trim();
  return text.replace(/\s{2,}/g, " ").trim();
}

function firstSentence(text: string, maxLen = MAX_SOURCE_QUOTE): string {
  const cleaned = stripAiBlob(text);
  if (!cleaned) return "";
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  const trimmed = sentence.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trim()}…`;
}

function extractSourceQuoteFromReasoning(reasoning: string): string | null {
  const match = reasoning.match(/Source quote:\s*"([^"]+)"/i);
  const quote = match?.[1]?.trim();
  return quote ? firstSentence(quote) : null;
}

function cleanReasoning(raw: string): string {
  const text = stripAiBlob(raw.replace(/Source quote:\s*"[^"]*"\s*/gi, ""));
  if (!text) return "";
  if (text.length <= MAX_REASONING) return text;
  return `${text.slice(0, MAX_REASONING - 1).trim()}…`;
}

function aiRowForField(
  field: LogUpdateRoutedFieldUpdate,
  parse: LogUpdateParseResult | null | undefined,
): { reasoning?: string; confidence?: string } | null {
  if (!parse?.aiMapping) return null;
  const confirmedIdx = field.id.match(/^ai-confirmed-(\d+)$/)?.[1];
  if (confirmedIdx != null) {
    return parse.aiMapping.confirmed_updates[Number(confirmedIdx)] ?? null;
  }
  const partialIdx = field.id.match(/^ai-partial-(\d+)$/)?.[1];
  if (partialIdx != null) {
    return parse.aiMapping.partial_updates[Number(partialIdx)] ?? null;
  }
  return null;
}

function confidenceLabelFromAi(confidence: string | undefined): string | null {
  switch (String(confidence ?? "").toLowerCase()) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return null;
  }
}

function confidenceLabelFromSignal(signal: OperationalSignal | null): string | null {
  if (!signal) return null;
  switch (signal.confidence) {
    case "provider_confirmed":
    case "observed_directly":
      return "High";
    case "operationally_inferred":
      return "Medium";
    case "early_signal":
      return "Medium";
    default:
      return "Low";
  }
}

function quoteFromNarrative(
  narrative: string,
  _topicId: OperationalReviewTopicId,
  signals: OperationalSignal[],
): string | null {
  for (const signal of signals) {
    if (signal.evidenceText) {
      const quote = firstSentence(signal.evidenceText);
      if (quote.length > 12) return quote;
    }
  }

  const contactName = signals.find((s) => s.softContactName)?.softContactName;
  if (contactName) {
    const idx = narrative.toLowerCase().indexOf(contactName.toLowerCase());
    if (idx >= 0) {
      return firstSentence(narrative.slice(Math.max(0, idx - 40), idx + contactName.length + 80));
    }
  }

  return null;
}

function topicReasoning(
  topicId: OperationalReviewTopicId,
  signals: OperationalSignal[],
): string | null {
  const contactName = signals.find((s) => s.softContactName)?.softContactName;
  const partial = signals.some((s) => s.status === "partial" || s.status === "unknown");

  switch (topicId) {
    case "scheduling":
      if (contactName && partial) {
        return `${contactName} appears involved in scheduling but authority is not confirmed.`;
      }
      if (partial) return "Scheduling was mentioned but ownership is not confirmed.";
      return "Scheduling ownership appears identified from the debrief.";
    case "observation_access":
      if (signals.some((s) => s.signalType === "blocker")) {
        return "Observation may be possible, but the approval path is still unclear.";
      }
      return "Provider openness to observation was noted without a confirmed approval path.";
    case "credentialing":
      return "Credentialing was mentioned; platform and steps still need confirmation.";
    case "product_interest":
      return "Product interest surfaced before case validation or surgeon-reviewed notes.";
    case "clinical_focus":
      return "Procedure focus or case mix was discussed without quantified volume.";
    case "workflow":
      return "Workflow context was captured but still needs field validation.";
    default:
      return null;
  }
}

function reasoningFromFields(
  parse: LogUpdateParseResult | null | undefined,
  fieldIds: string[],
): string | null {
  if (!parse) return null;
  for (const id of fieldIds) {
    const field = parse.fieldUpdates.find((f) => f.id === id);
    if (!field) continue;
    const row = aiRowForField(field, parse);
    if (row?.reasoning) {
      const cleaned = cleanReasoning(row.reasoning);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

function sourceQuoteFromFields(
  parse: LogUpdateParseResult | null | undefined,
  fieldIds: string[],
): string | null {
  if (!parse) return null;
  for (const id of fieldIds) {
    const field = parse.fieldUpdates.find((f) => f.id === id);
    if (!field) continue;
    const row = aiRowForField(field, parse);
    if (row?.reasoning) {
      const fromReasoning = extractSourceQuoteFromReasoning(row.reasoning);
      if (fromReasoning) return fromReasoning;
    }
    const fromField = sourceQuoteForField(field, parse);
    if (fromField) return firstSentence(fromField);
    const fromValue = firstSentence(field.proposedValue);
    if (fromValue && fromValue.length > 12 && !/still needed/i.test(fromValue)) {
      return fromValue;
    }
  }
  return null;
}

function confidenceFromFields(
  parse: LogUpdateParseResult | null | undefined,
  fieldIds: string[],
  fallbackSignal: OperationalSignal | null,
): string | null {
  if (parse) {
    for (const id of fieldIds) {
      const field = parse.fieldUpdates.find((f) => f.id === id);
      if (!field) continue;
      const row = aiRowForField(field, parse);
      const label = confidenceLabelFromAi(row?.confidence);
      if (label) return label;
    }
  }
  return confidenceLabelFromSignal(fallbackSignal);
}

function sourceQuoteFromSignals(signals: OperationalSignal[]): string | null {
  for (const signal of signals) {
    if (signal.evidenceText) {
      const quote = firstSentence(signal.evidenceText);
      if (quote.length > 12) return quote;
    }
    if (signal.summary) {
      const quote = firstSentence(signal.summary);
      if (quote.length > 12 && !/still needed|partial lead/i.test(quote)) return quote;
    }
  }
  return null;
}

export function buildStructuredEvidenceForTopic(input: {
  topicId: OperationalReviewTopicId;
  signals: OperationalSignal[];
  parse?: LogUpdateParseResult | null;
  fieldUpdateIds: string[];
  narrative?: string;
  primarySignal?: OperationalSignal | null;
}): DebriefStructuredEvidence {
  const primary = input.primarySignal ?? input.signals[0] ?? null;
  const sourceQuote =
    sourceQuoteFromFields(input.parse, input.fieldUpdateIds) ??
    sourceQuoteFromSignals(input.signals) ??
    (input.narrative ? quoteFromNarrative(input.narrative, input.topicId, input.signals) : null);

  const reasoning =
    topicReasoning(input.topicId, input.signals) ??
    reasoningFromFields(input.parse, input.fieldUpdateIds);

  return {
    sourceQuote: sourceQuote ? sanitizeOperationalUserText(sourceQuote, MAX_SOURCE_QUOTE) : null,
    confidenceLabel: confidenceFromFields(input.parse, input.fieldUpdateIds, primary),
    reasoning: reasoning ? sanitizeOperationalUserText(reasoning, MAX_REASONING) : null,
  };
}

export function buildStructuredEvidenceForIntelligenceItem(
  item: DebriefIntelligenceUpdateItem,
  review: LogUpdateParseResult,
): DebriefStructuredEvidence {
  const row = aiRowForField(item.field, review);
  const sourceQuote =
    (item.evidenceQuote ? firstSentence(item.evidenceQuote) : null) ??
    (item.sourceQuote ? firstSentence(item.sourceQuote) : null) ??
    (row?.reasoning ? extractSourceQuoteFromReasoning(row.reasoning) : null) ??
    firstSentence(item.proposedValue);

  const reasoning =
    item.suggestedUpdate ||
    (row?.reasoning ? cleanReasoning(row.reasoning) : null) ||
    firstSentence(item.extractedStatement);

  const confidenceLabel = item.confidenceLabel ??
    confidenceLabelFromAi(row?.confidence) ??
    (item.confidenceTier === "high_confidence"
      ? "High"
      : item.confidenceTier === "ambiguous"
        ? "Low"
        : "Medium");

  return {
    sourceQuote: sourceQuote && sourceQuote.length > 8 ? sourceQuote : null,
    confidenceLabel,
    reasoning: reasoning && reasoning !== sourceQuote ? reasoning : null,
  };
}

export function hasStructuredEvidence(evidence: DebriefStructuredEvidence): boolean {
  return Boolean(evidence.sourceQuote || evidence.confidenceLabel || evidence.reasoning);
}

export function buildStructuredEvidenceForInsightGroup(
  items: DebriefIntelligenceUpdateItem[],
  review: LogUpdateParseResult,
): DebriefStructuredEvidence {
  for (const item of items) {
    const evidence = buildStructuredEvidenceForIntelligenceItem(item, review);
    if (hasStructuredEvidence(evidence)) return evidence;
  }
  return {
    sourceQuote: null,
    confidenceLabel: null,
    reasoning: null,
  };
}
