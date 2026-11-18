/**
 * Interaction-scoped planning — belongs on engagements (Prepare for Meeting / Pre-Call Plan),
 * not on the provider intelligence profile.
 */

import { PRE_CALL_PLAN_FIELD_CONFIGS, PRE_CALL_PLAN_LABEL } from "@/lib/surgical-sales/preCallPlanFields";

export const ENGAGEMENT_INTERACTION_PLANNING_LABEL = "Engagement preparation";

export const ENGAGEMENT_INTERACTION_PLANNING_DESCRIPTION =
  "Engagement-specific intelligence (Layer 2): visit goals, hypotheses, strategy, probes, and temporary notes. Stored on the engagement — not persistent provider intelligence.";

/** Pre-Call Plan fields shown in engagement preparation flows. */
export const ENGAGEMENT_PREPARATION_FIELD_CONFIGS = PRE_CALL_PLAN_FIELD_CONFIGS;

export { PRE_CALL_PLAN_LABEL as ENGAGEMENT_PRE_CALL_PLAN_LABEL };

/**
 * @deprecated Provider-level clinical discovery answers were interaction notes.
 * New capture should use engagement `pre_observation_probes` and related Pre-Call Plan fields.
 */
export const DEPRECATED_PROVIDER_CLINICAL_DISCOVERY_NOTE =
  "One-off discovery notes belong on engagement preparation (Pre-Call Plan), not persistent provider intelligence.";

export function appendTextToEngagementField(
  existing: string | null | undefined,
  addition: string,
  maxLen = 16000,
): string {
  const prev = String(existing ?? "").trim();
  const next = String(addition ?? "").trim();
  if (!next) return prev;
  const combined = prev ? `${prev}\n\n${next}` : next;
  return combined.length > maxLen ? combined.slice(0, maxLen) : combined;
}
