/**
 * Discovery evidence formatting — leaf helpers with no metadata / workflow imports.
 * Keeps providerIntelligenceFieldMetadata out of the discovery evidence import cycle.
 */

/** Mirror of observationAccessWorkflowState OBSERVATION_ACCESS_CONDITIONAL_EVIDENCE. */
const OBSERVATION_ACCESS_CONDITIONAL_EVIDENCE =
  "Observation appears possible once credentialing is complete.";

/** Tokens stored in planning columns — never show as field evidence quotes. */
const INTELLIGENCE_CAPTURE_TOKEN_VALUES = new Set([
  "easy",
  "restricted",
  "credentialing_required",
  "still_learning",
  "approved",
  "declined",
  "denied",
  "blocked",
  "no",
  "yes",
  "unknown",
  "open",
  "closed",
  "cleared",
  "required",
  "in_progress",
  "submitted",
  "not_required",
  "partial",
  "pending",
  "high",
  "medium",
  "low",
  "warm",
  "cold",
  "none",
]);

const SNAKE_CASE_TOKEN_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;

export function isIntelligenceCaptureTokenValue(value: string | null | undefined): boolean {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return true;
  if (INTELLIGENCE_CAPTURE_TOKEN_VALUES.has(text)) return true;
  if (text.length <= 4 && /^(yes|no)$/i.test(text)) return true;
  if (SNAKE_CASE_TOKEN_RE.test(text) && text.length <= 48) return true;
  return false;
}

export function isHumanReadableDiscoveryEvidence(value: string | null | undefined): boolean {
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (isIntelligenceCaptureTokenValue(text)) return false;
  if (text === OBSERVATION_ACCESS_CONDITIONAL_EVIDENCE) return true;
  if (text.startsWith("[Partial lead]")) return true;
  return text.length >= 16 || /\s/.test(text);
}

export function sanitizeDiscoveryEvidenceQuote(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  if (!isHumanReadableDiscoveryEvidence(text)) return null;
  return text;
}
