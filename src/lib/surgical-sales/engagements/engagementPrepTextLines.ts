/** Split prep textarea content into scannable lines (bullets, newlines). */
export function splitEngagementPrepLines(text: string): string[] {
  return text
    .split(/\r?\n|•|·/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}
