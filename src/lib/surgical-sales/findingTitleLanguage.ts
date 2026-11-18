/** Shared interpretation-language guards for finding titles (no pipeline imports). */

export const FINDING_TITLE_INTERPRETATION_PATTERN =
  /\b(?:uncertain|keep watching|not sure|maybe|may be|might|appears to|appears to be|signal captured|observed again|used again|repeated signal|strengthens|needs supporting evidence|pending completion|product-fit hypothesis|adds a new signal|case not complete|new signal captured|new workflow signal|new signal|may be an opportunity|signal repeated|hypothesis|strengthened|in-progress case note)\b/i;

const TITLE_PREFIX_NOISE =
  /^(?:new\s+(?:workflow\s+)?signal\s+captured|signal\s+captured|product-fit\s+opportunity\s+noted|new\s+product-fit\s+opportunity\s+noted|new\s+provider\s+pain\s+point\s+captured|new\s+staff\s+pain\s+point\s+captured|new\s+product\s+observed|new\s+staff\s+workflow\s+signal\s+captured)\s*[:\-–—]\s*/i;

export function containsInterpretiveTitleLanguage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return FINDING_TITLE_INTERPRETATION_PATTERN.test(trimmed);
}

export function stripInterpretivePhrasesFromLabel(label: string): string {
  return label
    .trim()
    .replace(TITLE_PREFIX_NOISE, "")
    .replace(/\s+\b(?:again|noted|captured|signal|repeated)\b\.?$/gi, "")
    .replace(/\b(?:may be an opportunity|may be a product[-\s]?fit opportunity)\b/gi, "opportunity")
    .replace(/\b(?:appears to be|appears to)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function observationTitleSortScore(label: string): number {
  const clean = stripInterpretivePhrasesFromLabel(label);
  let score = 200 - clean.length;
  if (containsInterpretiveTitleLanguage(clean)) score -= 500;
  return score;
}

export function preferObservationTitle(left: string, right: string): string {
  const cleanLeft = stripInterpretivePhrasesFromLabel(left);
  const cleanRight = stripInterpretivePhrasesFromLabel(right);
  if (!cleanLeft) return cleanRight;
  if (!cleanRight) return cleanLeft;
  return observationTitleSortScore(cleanLeft) >= observationTitleSortScore(cleanRight)
    ? cleanLeft
    : cleanRight;
}
