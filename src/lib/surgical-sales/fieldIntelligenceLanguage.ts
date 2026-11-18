/**
 * Field intelligence voice — direct operational language for reps, not consultant prose.
 */

const CONSULTANT_CLAUSE =
  /,?\s*\b(?:indicating|suggesting|which\s+(?:could|may|might)|that\s+(?:could|may|might)|potentially|likely\s+to|may\s+lead\s+to|could\s+(?:impact|hinder|affect|influence|limit|undermine|accelerate|improve)|would\s+(?:impact|hinder|affect)|demonstrates|highlights|underscores|reflects\s+a)\b[^.;!?]*/gi;

const SPECULATIVE_PHRASE =
  /\b(?:potential\s+interest|diverse\s+product\s+applications?|product\s+acceptance(?:\s+and\s+usage)?|commercial\s+(?:impact|opportunity)|evaluation\s+(?:efforts?|likelihood)|future\s+engagement\s+efforts?|strategic\s+(?:opportunity|alignment)|win\s+probability|deal\s+velocity|adoption\s+likelihood|usage\s+potential)\b/gi;

const HEDGED_FAILURE =
  /\b(?:lack\s+of\s+clarity\s+could|could\s+hinder|may\s+impede|might\s+limit|uncertainty\s+could)\b[^.;!?]*/gi;

const PHRASE_REWRITES: Array<[RegExp, string]> = [
  [
    /\bperforms?\s+a\s+variety\s+of\s+surgical\s+procedures?,?\s*indicating[^.!?]*/gi,
    "Open, lap, and robotic cases were mentioned, but the actual case mix still needs confirmation.",
  ],
  [
    /\b(?:the\s+)?lack\s+of\s+clarity\s+could\s+hinder[^.!?]*/gi,
    "Scheduling contact still needs to be identified before next steps are reliable.",
  ],
  [
    /\bcould\s+impact\s+product\s+acceptance(?:\s+and\s+usage)?[^.!?]*/gi,
    "Product fit still needs confirmation.",
  ],
  [
    /\bindicating\s+potential\s+interest\s+in[^.!?]*/gi,
    "mentioned, but not validated for product fit.",
  ],
  [
    /\bvariety\s+of\s+surgical\s+procedures\b/gi,
    "open, lap, and robotic cases",
  ],
  [
    /\bnot\s+(?:yet\s+)?(?:identified|known|confirmed|validated|mapped)\b/gi,
    "still needs confirmation",
  ],
  [
    /\bunknown\b/gi,
    "still needs confirmation",
  ],
];

const PREFERRED_PARTIAL_MARKERS =
  /\b(?:partially\s+mapped|still\s+needs\s+confirmation|mentioned\s+but\s+not\s+validated|not\s+validated\s+yet)\b/i;

function patternMatches(text: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, pattern.flags.replace("g", ""));
  return re.test(text);
}

export function isConsultantProse(text: string): boolean {
  const t = String(text ?? "").trim();
  if (!t) return false;
  if (patternMatches(t, CONSULTANT_CLAUSE)) return true;
  if (patternMatches(t, SPECULATIVE_PHRASE)) return true;
  if (patternMatches(t, HEDGED_FAILURE)) return true;
  if (/\b(?:indicating|suggesting|could\s+impact|may\s+hinder)\b/i.test(t)) return true;
  return false;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\s+([,.;])/g, "$1").trim();
}

function stripConsultantClauses(text: string): string {
  let t = text;
  t = t.replace(CONSULTANT_CLAUSE, "");
  t = t.replace(HEDGED_FAILURE, "");
  t = t.replace(/\s{2,}/g, " ");
  t = t.replace(/,\s*,/g, ",");
  t = t.replace(/,\s*\./g, ".");
  return collapseWhitespace(t);
}

function applyPhraseRewrites(text: string): string {
  let t = text;
  for (const [pattern, replacement] of PHRASE_REWRITES) {
    t = t.replace(pattern, replacement);
  }
  return collapseWhitespace(t);
}

function shortenSummarySentence(text: string, maxLen = 220): string {
  const t = collapseWhitespace(text);
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 80 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[,;]\s*$/, "")}.`;
}

/**
 * Rewrite AI text into direct field intelligence voice.
 */
export function sanitizeFieldIntelligenceText(
  text: string | null | undefined,
  options?: { maxLen?: number; preferShort?: boolean },
): string {
  let t = String(text ?? "").trim();
  if (!t) return "";

  t = applyPhraseRewrites(t);
  if (isConsultantProse(t)) {
    t = stripConsultantClauses(t);
    t = applyPhraseRewrites(t);
  }

  t = t
    .replace(/\b(?:however|furthermore|moreover|additionally|in\s+conclusion)\b[:,]?\s*/gi, "")
    .replace(/\s+-\s+/g, " — ")
    .trim();

  if (options?.preferShort) {
    t = shortenSummarySentence(t, options.maxLen ?? 220);
  } else if (options?.maxLen && t.length > options.maxLen) {
    t = shortenSummarySentence(t, options.maxLen);
  }

  return collapseWhitespace(t);
}

/** Short debrief summary from field update lines — not a strategy memo. */
export function buildFieldIntelligenceSummary(lines: string[]): string {
  const cleaned = lines
    .map((line) => sanitizeFieldIntelligenceText(line, { preferShort: true, maxLen: 160 }))
    .filter(Boolean)
    .slice(0, 3);

  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0]!;
  return cleaned.slice(0, 2).join(" ");
}

/** Label text for profile updates — operational, not polished. */
export function sanitizeFieldIntelligenceLabel(label: string): string {
  const t = sanitizeFieldIntelligenceText(label, { maxLen: 120 });
  if (!t) return label.trim();
  if (PREFERRED_PARTIAL_MARKERS.test(t)) return t;
  if (/\bknown\b/i.test(t) && !/\bpartially\b/i.test(t)) {
    return t.replace(/\bknown\b/i, "partially mapped");
  }
  return t;
}

/** Value text shown on review cards and saved fields. */
export function sanitizeFieldIntelligenceValue(value: string): string {
  return sanitizeFieldIntelligenceText(value, { maxLen: 500 });
}
