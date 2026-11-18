/**
 * Contact role merging — one person, one contact profile with combined roles
 * (e.g. "Office Manager, Scheduling Coordinator").
 *
 * Intentionally dependency-free so both the review-items pipeline and the
 * review-card dedup pass can import it without module cycles.
 */

/** Placeholder labels that only matter when no real role was captured. */
const GENERIC_ROLE_PLACEHOLDER = /^(?:workflow participant|team member|staff member)$/i;

/** Canonicalize one role label — scheduling-flavored variants collapse to one vocabulary. */
export function normalizeContactRoleValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/schedul/i.test(trimmed)) return "Scheduling Coordinator";
  return trimmed;
}

/**
 * Combine every role signal captured for one person into a single profile
 * line. General roles lead, scheduling roles follow; duplicates collapse
 * case-insensitively and generic placeholders are dropped when a specific
 * role exists. Already-combined values ("A, B") are split and re-merged.
 */
export function combineContactRoleValues(
  values: Array<string | null | undefined>,
): string | null {
  const seen = new Set<string>();
  const general: string[] = [];
  const scheduling: string[] = [];
  const placeholders: string[] = [];
  for (const raw of values) {
    for (const part of String(raw ?? "").split(",")) {
      const normalized = normalizeContactRoleValue(part);
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (GENERIC_ROLE_PLACEHOLDER.test(normalized)) {
        placeholders.push(normalized);
        continue;
      }
      (/schedul/i.test(normalized) ? scheduling : general).push(normalized);
    }
  }
  const combined = [...general, ...scheduling];
  if (combined.length > 0) return combined.join(", ");
  return placeholders.length > 0 ? placeholders[0]! : null;
}

/** Field label for a combined role line — definite titles get "Role". */
export function contactRoleFieldLabel(combinedRole: string): string {
  return /coordinator|manager|owner/i.test(combinedRole) ? "Role" : "Possible Role";
}
