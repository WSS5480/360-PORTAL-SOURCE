/**
 * Early discovery / sparse-account framing — strategic guidance, not empty states.
 */

import type { ProviderOverviewIntelligenceDensity } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";

export const OVERVIEW_VISIBILITY_STILL_FORMING = "Limited field context available";
export const OVERVIEW_WORKFLOW_INTELLIGENCE_DEVELOPING = "Workflow intelligence developing";
export const OVERVIEW_OBSERVATION_VIABILITY_NOT_VALIDATED =
  "Observation viability not yet validated";
export const OVERVIEW_OPERATIONAL_CONFIDENCE_BUILDING = "Operational confidence building";

export const OVERVIEW_FIELD_ACTIVITY_ON_FILE = "Field activity on file";
export const OVERVIEW_OPERATIONAL_TOUCH_BUILDING =
  "Operational confidence building — first touch will sharpen the picture";

export const OVERVIEW_LAST_UPDATE_SPARSE =
  "Visibility developing — first capture will anchor the picture";
export const OVERVIEW_RECENT_LEARNING_SPARSE = OVERVIEW_WORKFLOW_INTELLIGENCE_DEVELOPING;
export const OVERVIEW_LATEST_VALIDATED_SPARSE =
  "Operational confidence building — validation follows first touch";
export const OVERVIEW_INTELLIGENCE_FRESHNESS_SPARSE = OVERVIEW_OBSERVATION_VIABILITY_NOT_VALIDATED;

export const OVERVIEW_INTEL_SCOPE_EMPTY_HINT =
  "Workflow intelligence developing — capture on next touch";

export const OVERVIEW_ACTIVITY_PREVIEW_EMPTY =
  "Operational picture developing — log a touchpoint or capture operational intelligence to build field memory.";

export const OVERVIEW_CAPTURE_AFTER_TOUCH =
  "Workflow intelligence developing — capture on next touch";

/** Default sparse-account facility signals — developing, not absent */
export const PROVIDER_OVERVIEW_DEFAULT_FACILITY_SIGNALS_DEVELOPING = [
  "Vendor clearance path still forming",
  "Credentialing steps need validation",
  "OR access process not yet confirmed",
] as const;

/** Default sparse-account provider signals — developing, not absent */
export const PROVIDER_OVERVIEW_DEFAULT_PROVIDER_SIGNALS_DEVELOPING = [
  "Procedure mix still developing",
  "Technique preferences need validation",
  "Field workflow not yet observed in the OR",
] as const;

export function overviewFreshnessWhenNoActivity(
  density: ProviderOverviewIntelligenceDensity,
): string {
  if (density === "sparse") return OVERVIEW_OPERATIONAL_CONFIDENCE_BUILDING;
  return "Field touchpoints will sharpen the operational picture";
}

export function overviewObservationHistorySignal(input: {
  density: ProviderOverviewIntelligenceDensity;
}): { label: string; meaning: string; actionHint: string } {
  return {
    label: "Observation history not yet on file",
    meaning:
      input.density === "sparse"
        ? "Observation pathway still developing — validate access on early touches"
        : "OR days not yet logged — plan when access is confirmed",
    actionHint: "Open observation readiness",
  };
}
