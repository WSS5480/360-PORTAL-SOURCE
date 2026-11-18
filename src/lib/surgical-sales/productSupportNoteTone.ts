/**
 * Shared tone helpers for product-support note classification and outcomes.
 * Prevents minor friction (brief delay, sizing questions) from overriding overall success.
 */

const OVERALL_SUCCESS_RE =
  /\b(went\s+smoothly|went\s+well|overall\s+things\s+went|no\s+major\s+issues|team\s+seemed\s+comfortable|things\s+went\s+well)\b/i;

const SIGNIFICANT_ISSUE_RE =
  /\b(broken|failed|failure|complication|defect|recall|wrong\s+(?:size|item|product)|missing\s+(?:component|item|tray)|backorder|didn['']t\s+work|major\s+(?:issue|problem|complaint))\b/i;

const MINOR_FRICTION_RE =
  /\b(brief\s+delay|little\s+extra\s+time|asked\s+(?:a\s+)?(?:couple\s+of\s+)?questions|confirmed\s+they\s+had|availability\s+questioned)\b/i;

export function productSupportNoteHasOverallSuccess(text: string): boolean {
  return OVERALL_SUCCESS_RE.test(text.trim());
}

export function productSupportNoteHasSignificantIssue(text: string): boolean {
  return SIGNIFICANT_ISSUE_RE.test(text.trim());
}

/** True when the note reads as mostly successful with only minor operational friction. */
export function productSupportNoteIsMinorFrictionOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (productSupportNoteHasSignificantIssue(trimmed)) return false;
  return productSupportNoteHasOverallSuccess(trimmed) && MINOR_FRICTION_RE.test(trimmed);
}

export function productSupportIssueSignalMatches(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/\b(issue|problem|broken|failed|failure|complication|defect|recall|wrong|missing|delay|backorder)\b/i.test(trimmed)) {
    if (productSupportNoteIsMinorFrictionOnly(trimmed)) return false;
    return true;
  }
  return /\bdidn['']t work\b/i.test(trimmed);
}
