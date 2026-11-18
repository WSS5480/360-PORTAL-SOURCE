/**
 * Pre-render evidence cleaning for Review Updates cards.
 * raw evidence → drop planning language → drop truncated → topic filter → dedupe → display quotes
 */

import type { DebriefReviewCardCategory } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

export type ReviewEvidenceTopic =
  | "observation_access"
  | "clinical_focus"
  | "workflow_participant"
  | "organization_intelligence"
  | "rep_planning"
  | "unclassified";

/** Rule 1 — rep actions / next steps, not observed intelligence. */
export const REP_PLANNING_EVIDENCE_START_RE =
  /^(?:my\s+next\s+step|i\s+plan\s+to|i\s+need\s+to|follow[\s-]?up|next\s+touch|i['']ll|i\s+will|we\s+should|need\s+to\s+confirm)\b/i;

const SENTENCE_START_WORDS = new Set([
  "a",
  "an",
  "are",
  "best",
  "the",
  "he",
  "she",
  "they",
  "it",
  "we",
  "i",
  "when",
  "next",
  "send",
  "follow",
  "ask",
  "schedule",
  "observe",
  "tom",
  "no",
  "overall",
  "clinically",
]);

export function bareEvidenceText(quote: string): string {
  return String(quote ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

export function formatReviewEvidenceQuote(quote: string): string {
  const bare = bareEvidenceText(quote);
  if (!bare) return "";
  return bare.startsWith('"') ? bare : `"${bare}"`;
}

export function isRepPlanningEvidence(quote: string): boolean {
  const bare = bareEvidenceText(quote);
  if (!bare) return true;
  const withoutLead = bare.replace(/^[^a-zA-Z]+/, "").trim();
  return REP_PLANNING_EVIDENCE_START_RE.test(withoutLead);
}

/** Rule 3 — reject mid-word / punctuation fragments from bad chunking. */
const TRUNCATED_FRAGMENT_WORDS = new Set([
  "co",
  "coordin",
  "rst",
  "irst",
  "con",
  "d",
  "e",
]);

/** Recover text after a bad chunk lead (e.g. "irst. He mentioned…" → "He mentioned…"). */
/** Expand a chunked snippet to the full dictation sentence when possible. */
export function alignEvidenceToDictation(quote: string, dictation: string): string {
  const recovered = recoverTruncatedEvidenceLead(quote);
  const bare = bareEvidenceText(recovered);
  if (!bare || !dictation.trim()) return bare;

  const lowerDictation = dictation.toLowerCase();
  const anchors = [
    "he mentioned",
    "clinically, he mentioned",
    "when i asked about observation",
    "tom said",
    "no observation was",
    "he wasn't opposed",
  ];

  for (const anchor of anchors) {
    const idx = lowerDictation.indexOf(anchor);
    if (idx < 0) continue;
    if (!bare.toLowerCase().includes(anchor.slice(0, Math.min(anchor.length, 12)))) continue;
    const fromDictation = dictation.slice(idx);
    const sentence = fromDictation.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0]?.trim();
    if (sentence && sentence.length >= bare.length) return sentence;
  }

  const probe = bare.toLowerCase().slice(0, Math.min(48, bare.length));
  const probeIdx = lowerDictation.indexOf(probe);
  if (probeIdx >= 0) {
    const fromDictation = dictation.slice(probeIdx);
    const sentence = fromDictation.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0]?.trim();
    if (sentence) return sentence;
  }

  return bare;
}

export function recoverTruncatedEvidenceLead(quote: string): string {
  const bare = bareEvidenceText(quote);
  const anchors = [
    /\bHe mentioned\b/i,
    /\bShe mentioned\b/i,
    /\bTom said\b/i,
    /\bClinically,\b/i,
    /\bWhen I asked\b/i,
    /\bNo observation\b/i,
    /\bThey've been\b/i,
    /\bHe wasn't\b/i,
  ];
  for (const anchor of anchors) {
    const match = bare.match(anchor);
    if (match?.index !== undefined && match.index > 0) {
      return bare.slice(match.index).trim();
    }
  }
  return bare;
}

export function isTruncatedEvidence(quote: string): boolean {
  const bare = recoverTruncatedEvidenceLead(quote);
  if (!bare) return true;

  const body = bare.replace(/^["']+/, "").trim();
  if (!body) return true;

  if (/^[,.\-;:)\]]/.test(body)) return true;
  if (/^[a-z]{1,3}\./.test(body)) return true;

  const firstWord = (body.match(/^["']?([A-Za-z']+)/)?.[1] ?? "").toLowerCase();
  if (firstWord && /^[a-z]/.test(firstWord)) {
    if (firstWord.length <= 4 && !SENTENCE_START_WORDS.has(firstWord)) return true;
    if (TRUNCATED_FRAGMENT_WORDS.has(firstWord)) return true;
  }

  const tail = body.replace(/["']+$/, "").trim();
  if (/[.!?]$/.test(tail)) return false;

  const lastToken = tail.split(/\s+/).pop()?.toLowerCase() ?? "";
  if (!lastToken) return true;
  if (TRUNCATED_FRAGMENT_WORDS.has(lastToken)) return true;
  if (lastToken.length <= 3) return true;

  return false;
}

function tokenizeForSimilarity(text: string): string[] {
  return bareEvidenceText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Jaccard similarity on word tokens. */
export function evidenceSimilarity(a: string, b: string): number {
  const ta = tokenizeForSimilarity(a);
  const tb = tokenizeForSimilarity(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setA = new Set(ta);
  const setB = new Set(tb);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Rule 2 — keep longest when snippets are ≥ threshold similar. */
export function dedupeSimilarEvidence(quotes: string[], threshold = 0.8): string[] {
  const sorted = [...quotes].sort((a, b) => bareEvidenceText(b).length - bareEvidenceText(a).length);
  const kept: string[] = [];

  for (const candidate of sorted) {
    const bare = bareEvidenceText(candidate);
    if (!bare) continue;
    const duplicate = kept.some((existing) => {
      const sim = evidenceSimilarity(existing, candidate);
      if (sim >= threshold) return true;
      const shorter = bareEvidenceText(existing);
      const longer = bare;
      const short = shorter.length <= longer.length ? shorter : longer;
      const long = shorter.length > longer.length ? shorter : longer;
      if (short.length >= 30 && long.includes(short)) return true;
      const prefixLen = Math.min(40, short.length, long.length);
      if (prefixLen >= 24 && short.slice(0, prefixLen) === long.slice(0, prefixLen)) return true;
      return false;
    });
    if (!duplicate) kept.push(candidate);
  }

  return kept;
}

export function classifyReviewEvidenceTopic(
  quote: string,
  context?: { personName?: string },
): ReviewEvidenceTopic {
  if (isRepPlanningEvidence(quote)) return "rep_planning";
  const t = bareEvidenceText(quote).toLowerCase();

  if (
    /clinically|robotic ventral|abdominal wall|reconstruction cases|doing more robotic|hernia repairs/i.test(
      t,
    )
  ) {
    return "clinical_focus";
  }

  if (
    /observe|observation|credential|vendor|into the or|\bor\b|oppose.*case|approval|pathway|intellicentric/i.test(
      t,
    )
  ) {
    return "observation_access";
  }

  if (/schedul|coordinator|or scheduling/i.test(t)) {
    return "observation_access";
  }

  const firstName = context?.personName?.split(/\s+/)[0]?.trim();
  if (firstName && new RegExp(`\\b${firstName}\\b`, "i").test(t)) {
    if (/mentioned|handles|office|coordinator|contact/i.test(t)) return "workflow_participant";
  }

  if (/office.*hospital|hospital directly|facility|shared schedul/i.test(t)) {
    return "organization_intelligence";
  }

  return "unclassified";
}

export function isClinicalFocusEvidence(quote: string): boolean {
  if (isRepPlanningEvidence(quote) || isTruncatedEvidence(quote)) return false;
  return classifyReviewEvidenceTopic(quote) === "clinical_focus";
}

export function isObservationAccessEvidence(quote: string): boolean {
  if (isRepPlanningEvidence(quote) || isTruncatedEvidence(quote)) return false;
  if (isClinicalFocusEvidence(quote)) return false;
  const topic = classifyReviewEvidenceTopic(quote);
  if (topic === "observation_access") return true;
  const t = bareEvidenceText(quote).toLowerCase();
  return /schedul|surgical schedule|not a problem once|wasn't opposed|no observation was/i.test(t);
}

export function isContactCandidateEvidence(quote: string, personName: string): boolean {
  if (isRepPlanningEvidence(quote) || isTruncatedEvidence(quote)) return false;
  const first = personName.split(/\s+/)[0]?.trim();
  if (!first) return false;
  const t = bareEvidenceText(quote).toLowerCase();
  if (!new RegExp(`\\b${first}\\b`, "i").test(t)) return false;
  return /mentioned|handles|scheduling|coordinator|office|contact/i.test(t);
}

export function isOrganizationIntelligenceEvidence(quote: string): boolean {
  if (isRepPlanningEvidence(quote) || isTruncatedEvidence(quote)) return false;
  if (isClinicalFocusEvidence(quote)) return false;
  const topic = classifyReviewEvidenceTopic(quote);
  if (topic === "organization_intelligence") return true;
  const t = bareEvidenceText(quote).toLowerCase();
  return /intellicentric|hospital directly|office.*hospital|credentialing.*(?:or|platform|pathway)/i.test(
    t,
  );
}

export function isWorkflowInsightEvidence(quote: string): boolean {
  if (isRepPlanningEvidence(quote) || isTruncatedEvidence(quote)) return false;
  if (isClinicalFocusEvidence(quote)) return false;
  const t = bareEvidenceText(quote).toLowerCase();
  return (
    /instrumentation|operating room efficiency|workflow efficiency|turnover time|case setup|staff satisfaction|consistency|frustration|priority|pain point|unnecessary steps|multiple trauma|availability/i.test(
      t,
    ) || isOrganizationIntelligenceEvidence(quote)
  );
}

function isProductIntelligenceEvidence(quote: string): boolean {
  if (isRepPlanningEvidence(quote) || isTruncatedEvidence(quote)) return false;
  const t = bareEvidenceText(quote).toLowerCase();
  return /acumed|product|currently use|use .{0,40} for|vendor|mesh|implant|procedure/i.test(t);
}

function topicAllowedForCard(
  quote: string,
  cardCategory: DebriefReviewCardCategory,
  context?: { personName?: string },
): boolean {
  switch (cardCategory) {
    case "clinical_focus":
      return isClinicalFocusEvidence(quote) || /distal radius|fracture|trauma|referral volume|clinical trend/i.test(bareEvidenceText(quote));
    case "observation_access":
      return isObservationAccessEvidence(quote);
    case "workflow_participant":
      return isContactCandidateEvidence(quote, context?.personName ?? "");
    case "organization_intelligence":
      return isWorkflowInsightEvidence(quote);
    case "product_intelligence":
      return isProductIntelligenceEvidence(quote);
    case "follow_up_task":
      return bareEvidenceText(quote).length >= 12;
    default:
      return false;
  }
}

/** Full pre-render pipeline for a single review card. */
export function normalizeCardEvidenceQuotes(
  rawQuotes: string[],
  options: {
    cardCategory: DebriefReviewCardCategory;
    personName?: string;
    dictation?: string;
    similarityThreshold?: number;
    preserveProvidedQuotes?: boolean;
  },
): string[] {
  const flattened = rawQuotes
    .flat(Infinity)
    .filter((q): q is string => typeof q === "string")
    .map((q) =>
      options.preserveProvidedQuotes
        ? recoverTruncatedEvidenceLead(q)
        : options.dictation?.trim()
        ? alignEvidenceToDictation(q, options.dictation)
        : recoverTruncatedEvidenceLead(q),
    )
    .map((q) => bareEvidenceText(q))
    .filter(Boolean);

  const cleaned = flattened.filter((q) => {
    if (isTruncatedEvidence(q)) return false;
    if (options.cardCategory !== "follow_up_task" && isRepPlanningEvidence(q)) return false;
    return topicAllowedForCard(q, options.cardCategory, options);
  });

  const deduped = dedupeSimilarEvidence(cleaned, options.similarityThreshold ?? 0.8);
  if (deduped.length > 0) {
    return deduped.map(formatReviewEvidenceQuote).filter(Boolean);
  }

  // Fall back to aligned dictation snippet when topic heuristics were too strict.
  const fallback = flattened
    .filter((q) => !isTruncatedEvidence(q))
    .slice(0, 2)
    .map(formatReviewEvidenceQuote)
    .filter(Boolean);
  return fallback;
}

export function cleanMergedEvidenceQuotes(
  ...quoteGroups: string[][]
): string[] {
  return quoteGroups
    .flat(Infinity)
    .filter((q): q is string => typeof q === "string")
    .map((q) => bareEvidenceText(q))
    .filter((q) => q && !isRepPlanningEvidence(q) && !isTruncatedEvidence(q));
}
