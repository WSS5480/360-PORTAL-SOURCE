/**
 * Observation Note Pilot (v3) — deterministic validation pass.
 *
 * Runs on extractor output (AI or rules-fallback) before persistence:
 *   1. Evidence integrity (drop)    — evidence must be a substring of the note.
 *   2. Product canonicalization     — rewrite product values to canonical casing.
 *   3. Negated-evidence suppression — flag problem facts whose evidence asserts the
 *      ABSENCE of the problem, in noun-phrase form ("no room readiness issues",
 *      "very few interruptions") or verb-phrase form ("did not observe any delays").
 *   4. Minimization suppression     — flag (not drop) minimized delay/friction facts.
 *
 * Also assigns type-based default polarity to facts missing it (rules-fallback output).
 * Pure function — no IO.
 */

import { READINESS_DELAY_VALUE } from "./extractionPatterns";
import type {
  ObservationFact,
  ObservationFactPolarity,
  ObservationFactType,
} from "./observationFactTypes";

const DEFAULT_POLARITY_BY_TYPE: Record<ObservationFactType, ObservationFactPolarity> = {
  competitor_product: "neutral",
  current_product: "neutral",
  workflow_issue: "negative",
  provider_frustration: "negative",
  staff_issue: "negative",
  staff_efficiency: "positive",
  visualization_challenge: "negative",
  fixation_challenge: "negative",
  product_interest: "positive",
  product_fit_signal: "positive",
  workflow_delay: "negative",
  room_turnover_issue: "negative",
  training_gap: "negative",
  vendor_barrier: "negative",
};

/** Known product canonical casings — extend as products enter the pilot org's vocabulary. */
const CANONICAL_PRODUCT_CASING: Record<string, string> = {
  "bard mesh": "Bard Mesh",
  "acsis": "AcsIS",
  "endolumik": "Endolumik",
  "ventralight": "Ventralight",
  "competitor mesh": "Competitor Mesh",
  "competitor tray": "Competitor tray",
  "competitor rep present": "Competitor rep present",
};

const PRODUCT_FACT_TYPES = new Set<ObservationFactType>(["current_product", "competitor_product"]);

/** Delay/friction values eligible for minimization suppression. */
const SUPPRESSIBLE_DELAY_VALUES = new Set(
  [
    READINESS_DELAY_VALUE,
    "room turnover delay",
    "setup delay observed",
    "packaging friction observed",
    "staff workflow friction observed",
  ].map((value) => value.toLowerCase()),
);

const SUPPRESSIBLE_TYPES = new Set<ObservationFactType>([
  "workflow_issue",
  "workflow_delay",
  "room_turnover_issue",
  "staff_issue",
]);

/** Problem nouns an absence statement can scope — shared by both negation grammars. */
const PROBLEM_NOUN_ALTERNATION =
  "(?:issues?|problems?|delays?|barriers?|friction|interruptions?|complaints?|concerns?|frustrations?|workarounds?|hiccups?)";

/** Negator + ≤2 modifier words + problem noun, with no intervening punctuation. */
const NEGATED_NOUN_PHRASE = String.raw`\s+(?:any\s+)?(?:[a-z][\w-]*\s+){0,2}${PROBLEM_NOUN_ALTERNATION}\b`;

/**
 * Evidence that asserts the ABSENCE of a problem via noun-phrase negation:
 * "no room readiness issues", "no supply-related delays", "very few interruptions".
 * The ≤2-word gap keeps real problems safe — "tray was not ready" has no problem
 * noun, and "no mesh available, causing delays" breaks the token chain at the
 * punctuation. Bare "not" is deliberately excluded for the same reason.
 */
const ABSENCE_STATEMENT_PATTERN = new RegExp(
  String.raw`\b(?:no|without(?:\s+any)?|zero|free\s+of|very\s+few|hardly\s+any|barely\s+any)${NEGATED_NOUN_PHRASE}`,
  "i",
);

/**
 * Verb-phrase absence: "did not observe any staff workarounds, delays, or workflow
 * issues", "never saw any delays". The negation lives in the perception verb, so the
 * noun-phrase grammar above cannot catch it; requiring a perception verb keeps real
 * problem statements ("could not find the tray") out of scope.
 */
const VERB_PHRASE_ABSENCE_PATTERN = new RegExp(
  String.raw`\b(?:did\s+not|didn'?t|never)\s+(?:observe[ds]?|see|saw|seen|notice[ds]?|hear[ds]?|heard|encounter(?:ed|s)?)${NEGATED_NOUN_PHRASE}`,
  "i",
);

const MINIMIZATION_PATTERN =
  /\bnothing major\b|\bnot a big deal\b|\bno big (?:issue|deal)\b|\bwasn'?t (?:really )?a problem\b|\bno real (?:delay|issue|problem)\b|\bminor\b/i;

const MATERIALITY_PATTERN =
  /\b\d+\s*(?:minutes?|mins?)\b|\bstood (?:around|still)\b|\bhad to (?:wait|stop)\b|\bsignificant\b|\bcase (?:stood|stopped|halted)\b/i;

const PRODUCT_USAGE_DISQUALIFIER_RE =
  /\b(?:asked|question|questions|interested|interest|curious|future|evaluation|evaluate|compare|compared|compares|comparison|works?\s+with|learning curve|commitments?|commitment)\b/i;

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

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function escapeRegExp(text: string): string {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function compactProductPattern(productName: string): string | null {
  const tokens = productName.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (tokens.length === 0) return null;
  return tokens.join(String.raw`\s+`);
}

export function evidenceDirectlyStatesObservationProductUsed(input: {
  evidence?: string | null;
  productName?: string | null;
}): boolean {
  const evidence = String(input.evidence ?? "").trim();
  const productName = String(input.productName ?? "").trim();
  if (!evidence || !productName) return false;

  const product = compactProductPattern(productName);
  if (!product) return false;

  const directUsagePatterns = [
    new RegExp(String.raw`\b(?:used|using|uses|trialed|trialled|implanted|placed|deployed|opened)\s+(?:the\s+)?${product}\b`, "i"),
    new RegExp(String.raw`\b(?:used|using|uses|trialed|trialled|implanted|placed|deployed|opened)\b[^.!?]{0,80}\b${product}\b`, "i"),
    new RegExp(String.raw`\b${product}\b[^.!?]{0,48}\b(?:was|were|is|in\s+use|used|trialed|trialled|implanted|placed|deployed)\b`, "i"),
    new RegExp(String.raw`\bhad\s+(?:the\s+)?${product}\b[^.!?]{0,48}\b(?:in|during|for|on)\s+(?:the\s+)?(?:case|procedure|surgery)\b`, "i"),
    new RegExp(String.raw`\b${product}\b[^.!?]{0,48}\b(?:in|during|for|on)\s+(?:the\s+)?(?:case|procedure|surgery)\b`, "i"),
  ];

  if (directUsagePatterns.some((pattern) => pattern.test(evidence))) return true;
  if (PRODUCT_USAGE_DISQUALIFIER_RE.test(evidence)) return false;
  return false;
}

function evidenceAppearsInNote(evidence: string, noteBody: string): boolean {
  const normalizedEvidence = normalizeWhitespace(evidence);
  if (!normalizedEvidence) return false;
  return normalizeWhitespace(noteBody).includes(normalizedEvidence);
}

function canonicalizeProductValue(value: string): string {
  const known = CANONICAL_PRODUCT_CASING[value.trim().toLowerCase()];
  if (known) return known;
  return titleCasePhrase(value);
}

function splitNoteSentences(noteBody: string): string[] {
  return noteBody
    .split(/\n+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Evidence sentence plus its immediate neighbors — the locality window for minimization context. */
function sentenceWindowForEvidence(evidence: string, sentences: string[]): string {
  const normalizedEvidence = normalizeWhitespace(evidence);
  const index = sentences.findIndex((sentence) => {
    const normalized = normalizeWhitespace(sentence);
    return normalized.includes(normalizedEvidence) || normalizedEvidence.includes(normalized);
  });
  if (index === -1) return evidence;
  return [sentences[index - 1], sentences[index], sentences[index + 1]]
    .filter(Boolean)
    .join(" ");
}

/**
 * True when a problem-type fact's own evidence is an absence statement — the
 * extractor turned "no X issues / no X delays" into an X-issue fact.
 * Scoped by type default (problem types) rather than emitted polarity so a
 * mislabeled polarity cannot smuggle the fact through.
 */
function isNegatedEvidenceFact(fact: ObservationFact): boolean {
  if (DEFAULT_POLARITY_BY_TYPE[fact.type] !== "negative") return false;
  return (
    ABSENCE_STATEMENT_PATTERN.test(fact.evidence) ||
    VERB_PHRASE_ABSENCE_PATTERN.test(fact.evidence)
  );
}

function isMinimizedDelayFact(fact: ObservationFact, sentences: string[]): boolean {
  if (!SUPPRESSIBLE_TYPES.has(fact.type)) return false;
  if (!SUPPRESSIBLE_DELAY_VALUES.has(fact.value.trim().toLowerCase())) return false;

  const polarity = fact.polarity ?? DEFAULT_POLARITY_BY_TYPE[fact.type];
  if (polarity !== "negative") return false;

  const window = sentenceWindowForEvidence(fact.evidence, sentences);
  if (!MINIMIZATION_PATTERN.test(window)) return false;
  if (MATERIALITY_PATTERN.test(window)) return false;
  return true;
}

function isUnvalidatedProductUsageFact(fact: ObservationFact): boolean {
  if (!PRODUCT_FACT_TYPES.has(fact.type)) return false;
  return !evidenceDirectlyStatesObservationProductUsed({
    evidence: fact.evidence,
    productName: fact.value,
  });
}

/**
 * Validate extractor output against the note. Returns a new array — drops
 * hallucinated-evidence facts, canonicalizes product values, assigns default
 * polarity, and stamps `validation` on every surviving fact.
 */
export function validateObservationFacts(
  facts: ObservationFact[],
  noteBody: string,
): ObservationFact[] {
  const sentences = splitNoteSentences(noteBody);
  const validated: ObservationFact[] = [];

  for (const fact of facts) {
    if (!evidenceAppearsInNote(fact.evidence, noteBody)) continue;

    const value = PRODUCT_FACT_TYPES.has(fact.type)
      ? canonicalizeProductValue(fact.value)
      : fact.value.trim();

    const withDefaults: ObservationFact = {
      ...fact,
      value,
      evidence: fact.evidence.trim(),
      polarity: fact.polarity ?? DEFAULT_POLARITY_BY_TYPE[fact.type],
    };

    if (isNegatedEvidenceFact(withDefaults)) {
      validated.push({
        ...withDefaults,
        validation: { status: "suppressed", reason: "negated_evidence" },
      });
      continue;
    }

    if (isUnvalidatedProductUsageFact(withDefaults)) {
      validated.push({
        ...withDefaults,
        validation: { status: "suppressed", reason: "product_usage_not_directly_observed" },
      });
      continue;
    }

    if (isMinimizedDelayFact(withDefaults, sentences)) {
      validated.push({
        ...withDefaults,
        validation: { status: "suppressed", reason: "minimized" },
      });
      continue;
    }

    validated.push({ ...withDefaults, validation: { status: "accepted" } });
  }

  return validated;
}

/** Accepted facts only — the set every downstream adapter is allowed to see. */
export function acceptedObservationFacts(facts: ObservationFact[]): ObservationFact[] {
  return facts.filter((fact) => fact.validation?.status !== "suppressed");
}
