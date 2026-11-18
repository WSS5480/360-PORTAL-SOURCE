/**
 * AI synthesis guardrails — enforced rules for operational intelligence display and persistence.
 *
 * Rules:
 * - Do not promote raw fragments into intelligence cards.
 * - Do not show incomplete sentence fragments.
 * - Do not infer too aggressively (low confidence / thin evidence stays partial or omitted).
 * - Do not make unanswered items sound like failure.
 * - Do not store facility policies as provider facts (scope guardrails).
 * - Do not store provider preferences as facility rules (scope guardrails).
 * - Preserve raw notes separately from synthesized intelligence (source vs operational_meaning).
 */

import { applyIntelligenceMappingGuardrails } from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import type { IntelligenceDomain, IntelligenceTarget } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type { ConfidenceLevel } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { resolveIntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeInference";
import {
  resolveIntelligenceSaveDestination,
  type IntelligenceSaveDestination,
} from "@/lib/surgical-sales/intelligenceSaveDestination";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import {
  textHasUncertaintyMarkers,
  textIsRepOpenNeed,
  textStatesAbsenceAsFact,
  textInfersUnsupportedCommercial,
} from "@/lib/surgical-sales/intelligenceClassificationGuardrails";
import {
  isIncompleteSentenceFragment,
  isLowQualityIntelligenceText,
  isRawFragmentUnsuitableForCard,
  sanitizeOperationalDisplayText,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";

export type SynthesisDurability = "durable" | "engagement_specific";

/** Required metadata for every synthesized intelligence item shown to reps. */
export type SynthesizedIntelligenceItem = {
  scope: IntelligenceScope;
  destination: IntelligenceSaveDestination;
  confidence: ConfidenceLevel;
  /** Raw excerpt or rep-note attribution — never promoted to cards as-is. */
  source: string;
  /** Complete operational synthesis — card-safe when guardrails pass. */
  operational_meaning: string;
  durability: SynthesisDurability;
  signal: string;
  domain?: IntelligenceDomain;
  dbKey?: string | null;
  /** When true, item may be written to durable profile fields. */
  persistEligible: boolean;
  /** When true, item may appear on scan cards and summaries. */
  displayEligible: boolean;
  guardrailNotes: string[];
};

export const AI_SYNTHESIS_GUARDRAIL_RULES = [
  "Do not promote raw fragments into intelligence cards.",
  "Do not show incomplete sentence fragments.",
  "Do not infer too aggressively.",
  "Do not make unanswered items sound like failure.",
  "Do not store facility policies as provider facts.",
  "Do not store provider preferences as facility rules.",
  "Preserve raw notes separately from synthesized intelligence.",
] as const;

const FAILURE_TONE =
  /\b(failed|failure|blocked|blocking|missing|gap|gaps|unresolved|not ready|cannot proceed|deal.?breaker|critical gap|major risk|no visibility)\b/i;

const UNANSWERED_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bnot validated\b/gi, "still learning"],
  [/\bnot confirmed\b/gi, "still learning"],
  [/\bstill unclear\b/gi, "still learning"],
  [/\bunclear\b/gi, "still learning"],
  [/\bunknown\b/gi, "still learning"],
  [/\bmissing\b/gi, "open"],
  [/\bunresolved\b/gi, "open"],
  [/\bgap\b/gi, "open item"],
  [/\bgaps\b/gi, "open items"],
];

/** Developmental copy for unanswered / open fields — not failure framing. */
export function sanitizeUnansweredIntelligenceCopy(text: string): string {
  let t = text.trim();
  if (!t) return t;
  for (const [pattern, replacement] of UNANSWERED_REPLACEMENTS) {
    t = t.replace(pattern, replacement);
  }
  if (FAILURE_TONE.test(t)) {
    for (const [pattern, replacement] of UNANSWERED_REPLACEMENTS) {
      t = t.replace(pattern, replacement);
    }
  }
  return t.replace(/\s+/g, " ").trim();
}

export function resolveSynthesisDurability(input: {
  destination: IntelligenceSaveDestination;
  text?: string;
  domain?: IntelligenceDomain | null;
}): SynthesisDurability {
  if (input.destination === "engagement_note") return "engagement_specific";
  if (input.destination === "case") return "engagement_specific";
  return "durable";
}

function hasSubstantiveEvidence(evidence: string): boolean {
  const t = evidence.trim();
  if (t.length < 16) return false;
  if (isLowQualityIntelligenceText(t)) return false;
  return true;
}

/** Downgrade confidence when inference outruns evidence. */
export function guardConfidenceAgainstOverInference(input: {
  confidence: ConfidenceLevel;
  operational_meaning: string;
  evidence: string;
}): ConfidenceLevel {
  const meaning = sanitizeOperationalDisplayText(input.operational_meaning);
  if (!meaning) return "low";

  const evidenceOk = hasSubstantiveEvidence(input.evidence);
  if (!evidenceOk) {
    return input.confidence === "high" ? "medium" : "low";
  }

  if (input.confidence === "high") {
    const meaningWords = meaning.split(/\s+/).filter(Boolean).length;
    const evidenceWords = input.evidence.trim().split(/\s+/).filter(Boolean).length;
    if (meaningWords > evidenceWords * 2.5 && evidenceWords < 8) {
      return "medium";
    }
  }

  return input.confidence;
}

export function isSynthesizedMeaningCardEligible(input: {
  operational_meaning: string;
  evidence?: string;
  signal?: string;
}): boolean {
  const meaning = sanitizeOperationalDisplayText(input.operational_meaning);
  if (!meaning) return false;
  if (isIncompleteSentenceFragment(meaning)) return false;
  if (isRawFragmentUnsuitableForCard(meaning, input.evidence)) return false;
  return true;
}

export function buildSynthesizedIntelligenceItem(input: {
  domain: IntelligenceDomain;
  signal: string;
  confidence: ConfidenceLevel;
  evidence: string;
  operational_meaning: string;
  target: IntelligenceTarget;
  reason: string;
  dbKey?: string | null;
}): SynthesizedIntelligenceItem | null {
  const rawSource = String(input.evidence ?? "").trim() || "Rep note";
  const meaning = sanitizeOperationalDisplayText(input.operational_meaning);
  if (!meaning) return null;

  const confidence = guardConfidenceAgainstOverInference({
    confidence: input.confidence,
    operational_meaning: meaning,
    evidence: rawSource,
  });

  const scopeResolution = resolveIntelligenceScope({
    domain: input.domain,
    text: `${meaning} ${rawSource}`,
    dbKey: input.dbKey,
    logUpdateTarget: input.target,
  });
  const guarded = applyIntelligenceMappingGuardrails({
    text: `${meaning} ${rawSource}`,
    dbKey: input.dbKey,
    domain: input.domain,
    logUpdateTarget: input.target,
    resolution: scopeResolution,
  });

  const destination = resolveIntelligenceSaveDestination({
    scope: guarded.scope,
    dbKey: input.dbKey,
    text: `${meaning} ${rawSource}`,
    domain: input.domain,
    logUpdateTarget: input.target,
  }).destination;

  const durability = resolveSynthesisDurability({
    destination,
    text: meaning,
    domain: input.domain,
  });

  const guardrailNotes: string[] = [];
  if (guarded.guardrailApplied) guardrailNotes.push(guarded.guardrailApplied);
  if (confidence !== input.confidence) {
    guardrailNotes.push("Confidence lowered — inference outran explicit evidence.");
  }

  const displayEligible = isSynthesizedMeaningCardEligible({
    operational_meaning: meaning,
    evidence: rawSource,
    signal: input.signal,
  });

  const combined = `${meaning} ${rawSource}`;
  const persistEligible =
    displayEligible &&
    confidence === "high" &&
    durability === "durable" &&
    destination !== "engagement_note" &&
    guarded.scope !== "case" &&
    !textHasUncertaintyMarkers(combined) &&
    !textStatesAbsenceAsFact(combined) &&
    !textIsRepOpenNeed(combined) &&
    !textInfersUnsupportedCommercial(combined);

  return {
    scope: guarded.scope,
    destination,
    confidence,
    source: rawSource,
    operational_meaning: meaning,
    durability,
    signal: input.signal.trim() || meaning.slice(0, 48),
    domain: input.domain,
    dbKey: input.dbKey ?? null,
    persistEligible,
    displayEligible,
    guardrailNotes,
  };
}

/** Split rep raw note from synthesized meaning for storage/display boundaries. */
export function separateRawNoteFromSynthesis(input: {
  rawNote: string;
  operational_meaning: string;
}): { rawNote: string; synthesized: string | null } {
  const raw = input.rawNote.trim();
  const synthesized = sanitizeOperationalDisplayText(input.operational_meaning);
  if (!synthesized) return { rawNote: raw, synthesized: null };
  if (meaningKey(raw) === meaningKey(synthesized)) {
    return { rawNote: raw, synthesized: null };
  }
  return { rawNote: raw, synthesized };
}

function meaningKey(text: string): string {
  return text.toLowerCase().trim().replace(/[\s-]+/g, "_").slice(0, 120);
}
