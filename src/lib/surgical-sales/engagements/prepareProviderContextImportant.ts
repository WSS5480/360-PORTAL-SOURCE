import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

const IMPORTANT_INTEL_KEYS = new Set([
  "competitor_usage",
  "product_interests",
  "relationship_strategy",
  "or_dynamics",
  "procedural_preferences",
]);

/** Expand provider context when profile intelligence is likely decision-relevant for this visit. */
export function shouldExpandPrepareProviderContext(input: {
  knownIntelligence: PrepareKnownIntelligence;
  supportContactsSummary: string | null;
}): boolean {
  if (input.knownIntelligence.last_key_insight?.body?.trim()) return true;
  if (input.knownIntelligence.bullets.some((b) => IMPORTANT_INTEL_KEYS.has(b.key))) return true;
  if (input.supportContactsSummary?.trim()) return true;
  return false;
}
