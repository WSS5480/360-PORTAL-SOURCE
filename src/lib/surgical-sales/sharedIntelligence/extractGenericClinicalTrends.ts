/**
 * Specialty-agnostic clinical / procedure trend extraction.
 * Complements catalog patterns — fires on volume language + any clinical noun phrase.
 */

import type { UniversalCanonicalConcept } from "@/lib/surgical-sales/universalExtractor/types";
import {
  canonicalProcedureLabel,
  hasProcedureVolumeLanguage,
  normalizeProcedureKey,
} from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import type { ProcedureSignal } from "@/lib/surgical-sales/sharedIntelligence/extractProcedureSignals";

function titleCasePhrase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      /[a-z][A-Z]/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

const CONVERSATION_TOPIC_FACT_RE =
  /\b(?:we|i)\s+(?:discussed|talked\s+(?:about|through)|reviewed|learned\s+more\s+about|covered)\b|\bconversation\s+(?:around|about)\b/i;

const PROVIDER_ATTRIBUTE_RE =
  /\b(?:he|she|they|provider|surgeon)\s+(?:is|are|does|do|perform(?:s|ed|ing)?|uses?|has|had|sees?|seeing|mentioned|described|said|reported|noted|continues?|continuing)\b|\b(?:is|are)\s+(?:a\s+)?(?:major\s+)?focus\b|\b(?:high(?:er)? volume|case volume|procedure volume|doing more|seeing more|increas|growing)\b/i;

function isConversationTopicDerivedPhrase(raw: string): boolean {
  return CONVERSATION_TOPIC_FACT_RE.test(raw) && !PROVIDER_ATTRIBUTE_RE.test(raw);
}

function cleanClinicalNounPhrase(raw: string): string | null {
  if (isConversationTopicDerivedPhrase(raw)) return null;

  let phrase = raw
    .split(/[.!?]/)
    .pop()
    ?.trim() ?? raw;

  phrase = phrase
    .replace(/\s+/g, " ")
    .replace(/\b(?:compared to|than)\s+(?:previous years?|they were|a year ago|last year).*$/i, "")
    .replace(/\b(?:in (?:his|her|their) practice|overall|recently|lately)\b/gi, " ")
    .replace(/\b(?:he|she|they|we|I)\s+(?:said|mentioned|noted|told|described)\b/gi, " ")
    .replace(/^(?:of|in)\s+/i, "")
    .replace(/\b(?:an?\s+|the\s+|more\s+|high(?:er)?\s+volume\s+|high(?:er)?\s+|strong(?:er)?\s+|increased?\s+|growing\s+)/gi, " ")
    .replace(/^(?:of|in)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  phrase = phrase.replace(/[,.!?;:]+$/g, "").trim();
  if (isConversationTopicDerivedPhrase(phrase)) return null;
  if (phrase.length < 4 || phrase.length > 72) return null;
  if (!/\b(?:case|cases|procedure|repair|reconstruction|fracture|trauma|surgery|volume|pattern|referrals?|work|hernia|abdominal|wall|robotic|fixation|visualization|disc|fusion|spine|joint|extremity|radius|ankle|pilon)\b/i.test(phrase)) {
    return null;
  }
  if (/^(?:that|this|those|these|it|they)$/i.test(phrase)) return null;
  return titleCasePhrase(phrase);
}

function buildDedupeKey(concept: UniversalCanonicalConcept, label: string): string {
  return `procedure:${concept}:${normalizeProcedureKey(label)}`;
}

function pushVolumeSignal(
  target: ProcedureSignal[],
  seen: Set<string>,
  rawPhrase: string,
  evidence: string,
): void {
  const cleaned = cleanClinicalNounPhrase(rawPhrase);
  if (!cleaned) return;

  if (/\b(?:and|plus)\b/i.test(cleaned)) {
    const parts = cleaned
      .split(/\b(?:and|plus)\b/i)
      .map((part) => cleanClinicalNounPhrase(part.replace(/\b(?:work|cases|procedures)\b/gi, " ").trim()))
      .filter((part): part is string => Boolean(part));
    if (parts.length >= 2) {
      for (const part of parts) {
        pushVolumeSignal(target, seen, part, evidence);
      }
      return;
    }
  }

  const canonical = canonicalProcedureLabel(cleaned);
  const normalizedLabel = `${canonical} · Increasing procedure volume`;
  const dedupeKey = buildDedupeKey("procedure_volume_trend", normalizedLabel);
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  target.push({
    normalizedLabel,
    procedureName: canonical,
    concept: "procedure_volume_trend",
    dipClinicalAttribute: "increasing_procedure_volume",
    procedureFocus: canonical,
    evidence,
    dedupeKey,
  });
}

/** Extract procedure volume trends from generic clinical language (any specialty). */
export function extractGenericVolumeTrendSignals(text: string): ProcedureSignal[] {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 12) return [];
  if (!hasProcedureVolumeLanguage(trimmed)) return [];

  const signals: ProcedureSignal[] = [];
  const seen = new Set<string>();

  const patterns: RegExp[] = [
    /\bincreasing\s+([^,.!?;]{4,90})\s+volume\b/gi,
    /\b([^,.!?;]{4,70})\s+volume\s+has\s+(?:increased|grown|risen)\b/gi,
    /\b(?:increased|increasing)\s+([^,.!?;]{4,90})\s+(?:fractures|cases|referrals|procedures|volume)\b/gi,
    /\b([^,.!?;]{4,70})\s+case\s+volume\s+is\s+increasing\b/gi,
    /\b(?:increase(?:d|s)?|growing)\s+(?:in|of)\s+([^,.!?;]{4,90})/gi,
    /\bhigh\s+volume\s+(?:in|of)\s+([^,.!?;]{4,90})/gi,
    /\bmore\s+([^,.!?;]{4,70})\s+than\s+(?:they were|previous|a year|last year)/gi,
    /\b([^,.!?;]{4,70})\s+(?:are|is)\s+becoming\s+more\s+common/gi,
    /\bseeing\s+(?:an?\s+)?(?:increase|more|growing)\s+(?:in|of)\s+([^,.!?;]{4,90})/gi,
    /\bgrowing\s+([^,.!?;]{4,90}?)\s+(?:cases|procedures|volume)\b/gi,
    /\b(?:doing )?(?:a )?lot more\s+([^,.!?;]{4,90})/gi,
  ];

  for (const pattern of patterns) {
    for (const match of trimmed.matchAll(pattern)) {
      const phrase = match[1]?.trim();
      if (phrase) pushVolumeSignal(signals, seen, phrase, trimmed);
    }
  }

  if (/\b(?:and|plus)\b/i.test(trimmed) && hasProcedureVolumeLanguage(trimmed)) {
    const clauses = trimmed.split(/\b(?:and|plus)\b/i);
    for (const clause of clauses) {
      if (!hasProcedureVolumeLanguage(clause) && !/\b(?:increase|more|growing|common)\b/i.test(clause)) {
        continue;
      }
      const nounMatch = clause.match(
        /(?:increase(?:d|s)?|more|growing|strong(?:er)?)\s+(?:in|of)\s+([^,.!?;]{4,90})/i,
      );
      if (nounMatch?.[1]) {
        pushVolumeSignal(signals, seen, nounMatch[1], trimmed);
      } else {
        const stripped = clause
          .replace(/^[^:]*:\s*/i, "")
          .replace(/.*?(?:increase(?:d|s)?|more|growing|seeing)\s+(?:in\s+)?/i, "")
          .trim();
        if (stripped.length >= 4) pushVolumeSignal(signals, seen, stripped, trimmed);
      }
    }
  }

  if (/\breferral volume\b/i.test(trimmed) && hasProcedureVolumeLanguage(trimmed)) {
    pushVolumeSignal(signals, seen, "Referral volume", trimmed);
  }

  return signals;
}

function pushFocusSignal(
  target: ProcedureSignal[],
  seen: Set<string>,
  rawPhrase: string,
  evidence: string,
): void {
  const cleaned = cleanClinicalNounPhrase(rawPhrase);
  if (!cleaned) return;

  const normalizedLabel = canonicalProcedureLabel(cleaned);
  const dedupeKey = buildDedupeKey("procedure_focus", normalizedLabel);
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  target.push({
    normalizedLabel,
    procedureName: normalizedLabel,
    concept: "procedure_focus",
    dipClinicalAttribute: "procedure_focus",
    procedureFocus: normalizedLabel,
    evidence,
    dedupeKey,
  });
}

/** Extract procedure focus areas from generic clinical language (any specialty). */
export function extractGenericProcedureFocusSignals(text: string): ProcedureSignal[] {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 12) return [];

  const signals: ProcedureSignal[] = [];
  const seen = new Set<string>();

  const patterns: RegExp[] = [
    /\b([^,.!?;]{4,70})\s+cases?\s+remain\s+(?:a\s+)?(?:major\s+)?focus\b/gi,
    /\b([^,.!?;]{4,90})\s+(?:is|are|remains?)\s+(?:a\s+)?(?:major\s+)?focus(?:\s+area)?\b/gi,
    /\bmajor focus(?:\s+(?:area|remains?))?\s+(?:on|in)\s+([^,.!?;]{4,90})/gi,
    /\b(?:high|strong)[-\s]+volume\s+(?:of\s+)?([^,.!?;]{4,90})/gi,
    /\b([^,.!?;]{4,90})\s+(?:is|are)\s+(?:a\s+)?(?:high|strong)[-\s]+volume\s+(?:area|areas|focus|practice)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of trimmed.matchAll(pattern)) {
      const phrase = match[1]?.trim();
      if (phrase) pushFocusSignal(signals, seen, phrase, match[0]?.trim() || trimmed);
    }
  }

  return signals;
}
