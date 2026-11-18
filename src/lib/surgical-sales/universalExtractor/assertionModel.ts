import type {
  UniversalAssertionLevel,
  UniversalDeclaredSourceType,
} from "@/lib/surgical-sales/universalExtractor/types";

/** Default assertion ceiling per declared source. */
export function defaultAssertionForDeclaredSource(
  source: UniversalDeclaredSourceType,
): UniversalAssertionLevel {
  switch (source) {
    case "intro_call":
    case "office_visit":
    case "discovery_note":
    case "debrief_note":
      return "provider_reported";
    case "observation_case":
      return "observed";
    case "product_support_case":
      return "case_supported";
    case "debrief_validation":
      return "validated";
    case "evaluation_note":
      return "evaluated";
    case "outcome_note":
      return "outcome_reported";
  }
}

/** Debrief validation language overrides default assertion. */
export function resolveDebriefValidationAssertion(fragment: string): UniversalAssertionLevel {
  const lower = fragment.trim().toLowerCase();
  const negatesRecurringIssue =
    /\bnot\s+(?:actually\s+)?(?:a\s+)?recurring\s+issue\b/.test(lower) ||
    /\bis\s+not\s+(?:actually\s+)?(?:a\s+)?recurring\s+issue\b/.test(lower);

  if (
    negatesRecurringIssue ||
    /\b(?:rejected|disputed|not\s+(?:true|accurate|valid)|denied|not\s+significant\s+enough)\b/.test(
      lower,
    )
  ) {
    return "rejected";
  }
  if (
    /\b(?:confirmed|validated|verified)\b/.test(lower) ||
    (/\brecurring\s+issue\b/.test(lower) && !negatesRecurringIssue)
  ) {
    return "validated";
  }
  if (/\b(?:occasionally|sometimes|not\s+significant|minor|qualified)\b/.test(lower)) {
    return "provider_reported";
  }
  return "validated";
}

export function resolveAssertionForFragment(
  source: UniversalDeclaredSourceType,
  fragment: string,
): UniversalAssertionLevel {
  if (source === "debrief_validation") {
    return resolveDebriefValidationAssertion(fragment);
  }
  return defaultAssertionForDeclaredSource(source);
}
