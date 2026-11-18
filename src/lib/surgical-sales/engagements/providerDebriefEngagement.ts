import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export const PROVIDER_DEBRIEF_ENGAGEMENT_TYPE = "provider_debrief" as const satisfies EngagementType;

export function isProviderDebriefEngagement(raw: string | null | undefined): boolean {
  return normalizeEngagementType(raw) === PROVIDER_DEBRIEF_ENGAGEMENT_TYPE;
}

export const PROVIDER_DEBRIEF_FIELD_BRIEFING_KICKER = "Debrief planning";

/** Shown on /prepare when the debrief engagement is already live. */
export const PROVIDER_DEBRIEF_ACTIVE_PREPARE_BANNER =
  "This Debrief is currently active. Changes made here affect the active engagement.";

export const PROVIDER_DEBRIEF_FIELD_BRIEFING_LEAD =
  "Prepare for your surgeon conversation — what you learned, what to confirm, and what outcome to drive toward.";

export const PROVIDER_DEBRIEF_FIELD_BRIEFING_TITLE = "Provider debrief briefing";

export const PLAN_PROVIDER_DEBRIEF_ACTION_LABEL = "Prepare Debrief";

export const PLAN_DEBRIEF_HEADER_ACTION_LABEL = "Prepare Debrief";

export const PLAN_PROVIDER_DEBRIEF_NEXT_STEP_LEAD =
  "Turn your observation notes into a structured surgeon debrief — provider, facility, and case context carry over automatically.";

export function providerDebriefFitLevelLabel(
  fitLevel: string,
): string {
  switch (fitLevel) {
    case "strong":
      return "Strong fit";
    case "possible":
      return "Possible fit";
    case "unlikely":
      return "Unlikely fit";
    case "needs_surgeon_confirmation":
      return "Needs surgeon confirmation";
    default:
      return "Unknown";
  }
}
