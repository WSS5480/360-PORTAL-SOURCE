/** Feature flags for universal surgical facts extraction and persistence. */

/** Run universal extraction + persist canonical facts (separate from legacy intelligence). */
export function isUniversalSurgicalFactsEnabled(): boolean {
  return (
    process.env.UNIVERSAL_SURGICAL_FACTS_PERSIST === "1" ||
    process.env.UNIVERSAL_EXTRACTOR_SHADOW_MODE === "1"
  );
}

/** GPT structured output as primary UF extraction engine (rules remain for validation/fallback). */
export function isGptUniversalFactExtractorEnabled(): boolean {
  return process.env.USE_GPT_UNIVERSAL_FACT_EXTRACTOR === "1";
}

/**
 * UF-primary review display (Phase 1) — separate from persist/shadow flags.
 * When on, Review Extracted Intelligence renders clinical/product rows from UF capture.
 */
export { isUniversalExtractionReviewPrimaryEnabled } from "./universalExtractorReviewFlag";

/** @deprecated Use isUniversalSurgicalFactsEnabled — kept for backward compatibility. */
export function isUniversalExtractorShadowEnabled(): boolean {
  return isUniversalSurgicalFactsEnabled();
}

export function isUniversalExtractorDevRouteEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.UNIVERSAL_EXTRACTOR_TEST_HARNESS === "1";
}
