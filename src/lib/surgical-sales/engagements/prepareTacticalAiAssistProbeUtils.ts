/** Split multiline probe fields into discrete asks (shared by assist + Prepare UI). */
export function splitProbeLines(text: string | null | undefined): string[] {
  return String(text ?? "")
    .split(/\n/)
    .map((l) => l.replace(/^[-*•\d.]+\s*/, "").trim())
    .filter(Boolean);
}

export function joinProbeLines(lines: string[]): string | null {
  const clean = lines.map((l) => l.trim()).filter(Boolean);
  return clean.length > 0 ? clean.join("\n") : null;
}

/** Lines present in `after` but not materially in `before`. */
export function diffAddedProbeLines(
  before: string | null | undefined,
  after: string | null | undefined,
): string[] {
  const prev = splitProbeLines(before);
  const next = splitProbeLines(after);
  return next.filter((line) => !prev.some((p) => isSimilarProbeLine(p, line)));
}

export function isSimilarProbeLine(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^\w\s]/g, "");
  const nb = b.toLowerCase().replace(/[^\w\s]/g, "");
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length >= nb.length ? na : nb;
  return shorter.length > 14 && longer.includes(shorter.slice(0, Math.min(24, shorter.length)));
}

export function previewProbeLine(line: string, max = 56): string {
  const t = line.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
