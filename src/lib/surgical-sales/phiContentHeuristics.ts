/**
 * Client-safe heuristics for common patient-identifiable patterns in free text or file names.
 * High false-positive rate is expected — use for warnings only, never as a hard block.
 */

export const SURGICAL_PHI_PATTERN_WARNING_HEADLINE = "Do not enter patient-identifiable information.";

/** Stable kind id returned by {@link detectSurgicalPhiPatternKinds}. */
export type SurgicalPhiPatternKind = string;

/** @deprecated Use {@link SurgicalPhiPatternKind}. */
export type PhiPatternKind = SurgicalPhiPatternKind;

const SSN_LIKE = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/;

/** DOB only when explicitly labeled (reduces false positives vs case dates). */
const DOB_WITH_KEYWORD =
  /\b(dob|date\s+of\s+birth|birth\s*date|born|b\.?\s*d\.?)\b[^.\n]{0,48}?(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}[/.-]\d{1,2}[/.-]\d{1,2})/i;

const MRN_LABELED =
  /\b(mrn|medical\s+record(?:\s*number)?|chart\s*#|patient\s*id|patient\s*identifier)\b\s*[:#]?\s*([\w.-]{4,32})/i;

const HASH_LONG_DIGITS = /(?:^|[\s,;[(])#\s*(\d{6,12})\b/;

/** Alphanumeric IDs common in hospitals; excludes obvious UUID segments. */
const MRN_ALNUM_TOKEN = /\b[A-Z]{2,4}[\s-]?\d{6,10}\b/i;

function looksLikeUuidFragment(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

/**
 * Returns stable machine-readable kind strings (for logging / UI), sorted.
 */
export function detectSurgicalPhiPatternKinds(text: string | null | undefined): string[] {
  const raw = String(text ?? "");
  if (!raw.trim()) return [];
  const kinds = new Set<string>();
  const t = raw;

  if (SSN_LIKE.test(t)) kinds.add("ssn_dashed_format");

  if (DOB_WITH_KEYWORD.test(t)) kinds.add("dob_keyword_near_date");

  if (MRN_LABELED.test(t)) kinds.add("mrn_labeled_field");

  if (HASH_LONG_DIGITS.test(t)) kinds.add("mrn_hash_long_digits");

  if (MRN_ALNUM_TOKEN.test(t)) {
    const matches = t.match(/\b[A-Z]{2,4}[\s-]?\d{6,10}\b/gi) || [];
    for (const tok of matches) {
      const compact = tok.replace(/\s|-/g, "");
      if (looksLikeUuidFragment(compact) || /^[0-9a-f]{12,}$/i.test(compact)) continue;
      kinds.add("mrn_like_alphanumeric_token");
      break;
    }
  }

  return [...kinds].sort();
}

export function surgicalPhiPatternSummary(kinds: string[]): string {
  if (kinds.length === 0) return "";
  const labels: Record<string, string> = {
    ssn_dashed_format: "SSN-like pattern",
    dob_keyword_near_date: "DOB-style text",
    mrn_labeled_field: "MRN / chart label",
    mrn_hash_long_digits: "# + long number",
    mrn_like_alphanumeric_token: "MRN-style code",
  };
  return kinds.map((k) => labels[k] || k).join(", ");
}
