/**
 * Phrases and patterns excluded from Review Updates UI — narrative AI copy, not save decisions.
 */

const EXCLUDED_REVIEW_PHRASE_RE =
  /\b(access summary|key takeaway|key takeaways|learned\b|what did ai|ai found|we found:|observation appears possible|observation access appears possible|appears possible with follow-through|appears possible if routed)\b/i;

export function isExcludedNarrativeReviewPhrase(text: string): boolean {
  const t = String(text ?? "").trim();
  if (!t) return true;
  return EXCLUDED_REVIEW_PHRASE_RE.test(t);
}

export function filterStructuredReviewLines(lines: string[]): string[] {
  return lines.filter((line) => !isExcludedNarrativeReviewPhrase(line));
}
