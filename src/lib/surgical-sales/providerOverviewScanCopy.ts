/**
 * Short scan-friendly copy for provider overview (3–5 second sections).
 */

export function scanLine(text: string | null | undefined, maxLen = 72): string {
  const trimmed = String(text ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const firstSentence = trimmed.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? trimmed;
  const candidate = firstSentence.length <= maxLen ? firstSentence : trimmed;
  if (candidate.length <= maxLen) return candidate;
  const slice = candidate.slice(0, maxLen - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 24 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

export function scanWords(text: string, maxWords = 10): string {
  const words = text.trim().replace(/\s+/g, " ").split(" ");
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}
