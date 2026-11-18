/**
 * UF authority for debrief review — Wave 1+2 cutover flags.
 *
 * UF_AUTHORITY_REVIEW=0 — legacy DIP fieldUpdates + review (rollback)
 * UF_AUTHORITY_REVIEW=1 — UF projection is review authority (default when unset)
 * DIP_REVIEW_SHADOW=1 — persist legacy_extraction on UF capture for shadow compare
 * UF_EXTRACTION_REVIEW_PRIMARY — legacy alias for UF_AUTHORITY_REVIEW
 */

export function isUniversalFactsReviewAuthorityEnabled(): boolean {
  const authority = process.env.UF_AUTHORITY_REVIEW;
  if (authority === "0" || authority === "false") return false;
  if (authority === "1" || authority === "true") return true;

  const legacy = process.env.UF_EXTRACTION_REVIEW_PRIMARY;
  if (legacy === "0" || legacy === "false") return false;
  if (legacy === "1" || legacy === "true") return true;

  // Wave 1+2 default: UF is review authority unless explicitly disabled.
  return true;
}

/** @deprecated Use isUniversalFactsReviewAuthorityEnabled */
export function isUniversalExtractionReviewPrimaryEnabled(): boolean {
  return isUniversalFactsReviewAuthorityEnabled();
}

/** When enabled, DIP OpenAI facts are attached to UF capture as legacy_extraction only. */
export function isDipReviewShadowEnabled(): boolean {
  return process.env.DIP_REVIEW_SHADOW === "1";
}
