/** Phase A: read-only OIE vs UF coaching guidance input comparison (evaluation only). */

export function isCoachingGuidanceInputsCompareEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return (
    process.env.COACHING_GUIDANCE_INPUTS_COMPARE === "1" ||
    process.env.UNIVERSAL_FACTS_READ_MODEL === "1" ||
    process.env.UNIVERSAL_SURGICAL_FACTS_PERSIST === "1" ||
    process.env.UNIVERSAL_SURGICAL_FACTS_PANEL === "1"
  );
}
