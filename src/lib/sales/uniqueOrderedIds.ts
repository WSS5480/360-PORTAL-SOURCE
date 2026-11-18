/** Dedupe while preserving first-seen order. */
export function uniqueOrderedIds(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    const id = String(x || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
