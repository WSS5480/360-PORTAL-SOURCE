/**
 * Leaf module (no imports) for concept-level display gating.
 *
 * Some concepts the classifier emits are bookkeeping — they mark "nothing
 * actionable here" or "could not classify" — and are never rep-facing
 * intelligence. They must never render as a captured-fact chip on any surface.
 * Specialty/product-agnostic.
 */
export const UF_NON_DISPLAY_META_CONCEPTS: ReadonlySet<string> = new Set([
  "no_issue_or_routine",
  "unknown",
]);

export function isUniversalFactNonDisplayMetaConcept(concept: string | null | undefined): boolean {
  return UF_NON_DISPLAY_META_CONCEPTS.has(String(concept ?? ""));
}
