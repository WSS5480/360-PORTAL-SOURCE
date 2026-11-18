/**
 * Resolve evidence quotes anchored in the rep's original debrief dictation.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { DebriefIntelligenceUpdateItem } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { sourceQuoteForField } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "been",
  "before",
  "from",
  "have",
  "that",
  "their",
  "there",
  "they",
  "this",
  "through",
  "were",
  "what",
  "when",
  "with",
  "would",
]);

function quoteCandidates(...values: Array<string | null | undefined>): string[] {
  return values.filter((c): c is string => Boolean(String(c ?? "").trim()));
}

function normalizeQuoteMatchText(text: string): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSourceQuoteFromReasoning(reasoning: string): string | null {
  const match = reasoning.match(/Source quote:\s*"([^"]+)"/i);
  const quote = match?.[1]?.trim();
  return quote || null;
}

export function cleanEvidenceCandidate(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function corePhraseForMatch(text: string): string {
  return normalizeQuoteMatchText(text)
    .replace(/[.!?,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteIsAnchoredInDictation(quote: string, dictation: string): boolean {
  const q = corePhraseForMatch(quote);
  const d = corePhraseForMatch(dictation);
  if (!q || !d || q.length < 10) return false;
  if (d.includes(q)) return true;

  const qWords = q.split(" ").filter((w) => w.length > 3);
  if (qWords.length < 3) return false;
  const window = qWords.slice(0, Math.min(8, qWords.length)).join(" ");
  return d.includes(window);
}

export function splitDictationSentences(dictation: string): string[] {
  return dictation
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
}

function significantTokens(text: string): string[] {
  return normalizeQuoteMatchText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

export function findBestMatchingDictationSentence(dictation: string, hintText: string): string | null {
  const hint = hintText.trim();
  if (!hint || !dictation.trim()) return null;

  const tokens = significantTokens(hint);
  if (tokens.length === 0) return null;

  let best: { sentence: string; score: number } | null = null;
  for (const sentence of splitDictationSentences(dictation)) {
    const lower = normalizeQuoteMatchText(sentence);
    let score = 0;
    for (const token of tokens) {
      if (lower.includes(token)) score += 1;
    }
    if (!best || score > best.score) best = { sentence, score };
  }

  if (!best || best.score < 2) return null;
  return best.sentence;
}

export function formatDictationEvidenceDisplay(quote: string): string {
  const cleaned = cleanEvidenceCandidate(quote);
  if (!cleaned) return "";
  return `"${cleaned}"`;
}

function reasoningQuoteForField(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): string | null {
  const ai = review.aiMapping;
  if (!ai) return null;
  const confirmedIdx = field.id.match(/^ai-confirmed-(\d+)$/)?.[1];
  if (confirmedIdx != null) {
    const row = ai.confirmed_updates[Number(confirmedIdx)];
    return row?.reasoning ? extractSourceQuoteFromReasoning(row.reasoning) : null;
  }
  const partialIdx = field.id.match(/^ai-partial-(\d+)$/)?.[1];
  if (partialIdx != null) {
    const row = ai.partial_updates[Number(partialIdx)];
    return row?.reasoning ? extractSourceQuoteFromReasoning(row.reasoning) : null;
  }
  return null;
}

export function collectEvidenceCandidatesForField(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
  item?: DebriefIntelligenceUpdateItem | null,
): string[] {
  const candidates: string[] = [];
  const push = (raw: string | null | undefined) => {
    const c = cleanEvidenceCandidate(raw);
    if (c) candidates.push(c);
  };

  push(reasoningQuoteForField(field, review));
  push(item?.evidenceQuote);
  push(item?.sourceQuote);
  push(sourceQuoteForField(field, review));

  const ai = review.aiMapping;
  if (ai?.operational_signals) {
    for (const signal of ai.operational_signals) {
      push(signal.evidence);
    }
  }

  return candidates;
}

/** Resolve a dictation-anchored evidence quote or null if none can be verified. */
export function resolveDictationEvidenceQuote(input: {
  dictation: string;
  candidates: string[];
  hintText?: string;
}): string | null {
  const dictation = input.dictation.trim();
  if (!dictation) return null;

  const seen = new Set<string>();
  for (const raw of input.candidates) {
    const candidate = cleanEvidenceCandidate(raw);
    if (!candidate || seen.has(candidate.toLowerCase())) continue;
    seen.add(candidate.toLowerCase());
    if (quoteIsAnchoredInDictation(candidate, dictation)) {
      return formatDictationEvidenceDisplay(candidate);
    }
  }

  const hint = input.hintText?.trim() || input.candidates.join(" ");
  const matched = findBestMatchingDictationSentence(dictation, hint);
  if (matched && quoteIsAnchoredInDictation(matched, dictation)) {
    return formatDictationEvidenceDisplay(matched);
  }

  return null;
}

export function resolveIntelligenceItemDictationEvidence(input: {
  item: DebriefIntelligenceUpdateItem;
  review: LogUpdateParseResult;
}): string | null {
  const dictation = input.review.sourceText.trim();
  const candidates = collectEvidenceCandidatesForField(input.item.field, input.review, input.item);
  const hint = [
    input.item.proposedValue,
    input.item.extractedStatement,
    input.item.intelligenceFieldLabel,
  ]
    .filter(Boolean)
    .join(" ");

  return resolveDictationEvidenceQuote({ dictation, candidates, hintText: hint });
}

export function resolveContactDictationEvidence(input: {
  dictation: string;
  sourceQuote: string | null | undefined;
  displayName: string;
  roleLabel: string;
}): string | null {
  return resolveDictationEvidenceQuote({
    dictation: input.dictation,
    candidates: quoteCandidates(input.sourceQuote, input.displayName, input.roleLabel),
    hintText: [input.displayName, input.roleLabel, input.sourceQuote].filter(Boolean).join(" "),
  });
}

export function resolvePlatformDictationEvidence(input: {
  dictation: string;
  sourceQuote: string | null | undefined;
  platformName: string;
}): string | null {
  return resolveDictationEvidenceQuote({
    dictation: input.dictation,
    candidates: quoteCandidates(input.sourceQuote, input.platformName),
    hintText: [input.platformName, input.sourceQuote].filter(Boolean).join(" "),
  });
}
