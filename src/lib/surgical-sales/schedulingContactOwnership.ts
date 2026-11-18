/**
 * Scheduling-contact ownership transitions — who departed, who succeeded.
 * Leaf module: no imports from namedEntityPreservation or contactEntityIdentity.
 */

import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";

/** Temporal/status words that regex capture groups sometimes append to names. */
const PERSON_NAME_SUFFIX_STOP_WORDS = new Set([
  "now",
  "still",
  "usually",
  "currently",
  "previously",
  "formerly",
  "recently",
  "also",
  "again",
  // Day-part / temporal tokens ("Dr. Lettuce today between clinic…").
  "today",
  "yesterday",
  "tomorrow",
  "earlier",
  "later",
  "morning",
  "afternoon",
  "evening",
  "tonight",
  "between",
  // Sentiment / verb tokens often captured after a provider surname ("Dr. Ham seemed open").
  "seemed",
  "seems",
  "appeared",
  "appears",
  "open",
  "interested",
  "receptive",
  "willing",
  "happy",
  "positive",
  "friendly",
  "enthusiastic",
  "in",
  "into",
  "lounge",
  "prefers",
  "prefer",
  "preferred",
  "declined",
  "declines",
  "went",
  "goes",
]);

export function normalizeExtractedPersonName(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  while (
    parts.length > 1 &&
    PERSON_NAME_SUFFIX_STOP_WORDS.has(parts[parts.length - 1]!.toLowerCase())
  ) {
    parts.pop();
  }
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export type SchedulingContactReplacement = {
  departedName: string | null;
  successorName: string;
  evidence: string;
  reason: string;
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function capturePersonName(raw: string): string | null {
  const name = normalizeExtractedPersonName(raw);
  return name && isPlausiblePersonName(name) ? name : null;
}

function departedOwnerInSentence(sentence: string): string | null {
  const patterns = [
    /\b(?:previously|formerly)\s+([A-Za-z][a-z]+)\s+(?:handled|handles|coordinated|coordinates)\b/i,
    /\b([A-Za-z][a-z]+)\s+(?:used\s+to|previously)\s+(?:handle|handled|coordinate|coordinated)\b/i,
    /\b([A-Za-z][a-z]+)\s+is\s+no\s+longer\s+(?:involved|handling|doing|managing)\b/i,
    /\b([A-Za-z][a-z]+)\s+is\s+no\s+longer\s+handling\s+scheduling\b/i,
    /\b([A-Za-z][a-z]+)\s+no\s+longer\s+(?:handles?|coordinates?|manages?)\s+scheduling\b/i,
  ];
  for (const pattern of patterns) {
    const match = sentence.match(pattern);
    const name = capturePersonName(match?.[1] ?? "");
    if (name) return name;
  }
  return null;
}

function successorOwnerInSentence(sentence: string): string | null {
  const patterns = [
    /\b([A-Za-z][a-z]+)\s+now\s+(?:coordinates?|handles?|manages?|runs?)\b/i,
    /\b([A-Za-z][a-z]+)\s+(?:has\s+)?taken\s+over\b/i,
    /\b([A-Za-z][a-z]+)\s+took\s+over\b/i,
    /\b(?:scheduling|observation\s+scheduling)\s+(?:now\s+)?(?:goes\s+through|runs\s+through|is\s+handled\s+by|handled\s+by)\s+([A-Za-z][a-z]+)\b/i,
    /\b(?:scheduling|observation\s+scheduling)\s+(?:moved|transferred)\s+(?:from\s+[A-Za-z][a-z]+\s+)?to\s+([A-Za-z][a-z]+)\b/i,
    /\bmoved\s+from\s+[A-Za-z][a-z]+\s+to\s+([A-Za-z][a-z]+)\b/i,
  ];
  for (const pattern of patterns) {
    const match = sentence.match(pattern);
    const name = capturePersonName(match?.[1] ?? "");
    if (name) return name;
  }
  return null;
}

function movedFromToInText(text: string): { departed: string; successor: string } | null {
  const match = text.match(/\b(?:scheduling\s+)?moved\s+from\s+([A-Za-z][a-z]+)\s+to\s+([A-Za-z][a-z]+)\b/i);
  if (!match) return null;
  const departed = capturePersonName(match[1] ?? "");
  const successor = capturePersonName(match[2] ?? "");
  if (!departed || !successor || departed.toLowerCase() === successor.toLowerCase()) return null;
  return { departed, successor };
}

function schedulingTransitionEvidence(sentences: string[]): string {
  const successorSentences = sentences.filter(
    (sentence) =>
      /\b(?:now\s+(?:coordinates?|handles?|manages?)|took\s+over|taken\s+over|moved\s+from)\b/i.test(
        sentence,
      ) && /\bschedul/i.test(sentence),
  );
  const departureSentences = sentences.filter((sentence) => /\bno\s+longer\b/i.test(sentence));
  if (successorSentences.length > 0) {
    return [...departureSentences, ...successorSentences].join(" ");
  }

  const movedSentence = sentences.find((sentence) => /\bmoved\s+from\b/i.test(sentence));
  if (movedSentence) return movedSentence;

  const relevant = sentences.filter(
    (sentence) =>
      /\b(?:previously|used\s+to)\b/i.test(sentence) && /\bschedul/i.test(sentence),
  );
  if (relevant.length > 0) return relevant.slice(-1).join(" ");
  const fallback = sentences.filter((sentence) => /\bschedul/i.test(sentence));
  return fallback.slice(-1).join(" ") || sentences.slice(-1).join(" ");
}

/**
 * Detect scheduling-contact ownership transitions. When the note states an old
 * owner is out and a new owner is in, return the successor — never the
 * historical owner — for merge-card proposed values.
 */
export function detectSchedulingContactReplacement(text: string): SchedulingContactReplacement | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const moved = movedFromToInText(trimmed);
  const sentences = splitSentences(trimmed);
  let departedName = moved?.departed ?? null;
  let successorName = moved?.successor ?? null;

  for (const sentence of sentences) {
    if (!departedName) {
      const departed = departedOwnerInSentence(sentence);
      if (departed) departedName = departed;
    }
    if (!successorName) {
      const successor = successorOwnerInSentence(sentence);
      if (successor) successorName = successor;
    }
  }

  if (!successorName) return null;
  if (departedName && departedName.toLowerCase() === successorName.toLowerCase()) return null;

  const evidence = schedulingTransitionEvidence(sentences);
  const reasonParts: string[] = [];
  if (departedName) reasonParts.push(`${departedName} no longer involved.`);
  if (/\bnow\s+(?:coordinates?|handles?)\b/i.test(evidence)) {
    reasonParts.push(`${successorName} now coordinates scheduling.`);
  } else if (/\btook\s+over\b|\btaken\s+over\b/i.test(evidence)) {
    reasonParts.push(`${successorName} took over scheduling.`);
  } else if (/\bmoved\s+from\b/i.test(evidence) && departedName) {
    reasonParts.push(`Scheduling moved from ${departedName} to ${successorName}.`);
  } else {
    reasonParts.push(`${successorName} now coordinates scheduling.`);
  }

  return {
    departedName,
    successorName,
    evidence: evidence || trimmed,
    reason: reasonParts.join(" "),
  };
}

/** True when the person appears only as a departed / historical scheduling owner. */
export function isDepartedSchedulingOwner(name: string, text: string): boolean {
  const normalized = normalizeExtractedPersonName(name);
  if (!normalized) return false;
  const replacement = detectSchedulingContactReplacement(text);
  if (replacement?.departedName?.toLowerCase() === normalized.toLowerCase()) return true;
  const re = new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return splitSentences(text)
    .filter((sentence) => re.test(sentence))
    .some((sentence) => /\b(?:previously|used\s+to|no\s+longer)\b/i.test(sentence));
}

export function buildSchedulingReplacementProposedValue(input: {
  replacement: SchedulingContactReplacement;
  role?: string | null;
}): string {
  const role = input.role?.trim() || "Scheduling Coordinator";
  const { successorName, evidence } = input.replacement;
  const quote = evidence.trim();
  return `${successorName} — ${role}. "${quote}"`;
}

/** Named successor with scheduling transition language anywhere in the note. */
export function schedulingContactReplacementNamed(text: string): boolean {
  return detectSchedulingContactReplacement(text) !== null;
}
