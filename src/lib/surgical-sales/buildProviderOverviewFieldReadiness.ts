/**
 * Field readiness — guidance on how much context supports the next field touch.
 */

import type { ProviderOverviewIntelligenceDensity } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";
import type { ProviderOverviewSimpleStatus } from "@/lib/surgical-sales/buildProviderOverviewSimpleView";
import type { ProviderFieldTimeRiskState } from "@/lib/surgical-sales/providerFieldTimeRiskVocabulary";
import type { OperationalVisibilityState } from "@/lib/surgical-sales/operationalVisibilityVocabulary";
import { operationalVisibilityStateLabel } from "@/lib/surgical-sales/operationalVisibilityVocabulary";
import { resolveProviderIntelligenceMaturityLabel } from "@/lib/surgical-sales/providerOverviewIntelligenceMaturity";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { PROVIDER_OVERVIEW_EARLY_VISIBILITY_HINT } from "@/lib/surgical-sales/providerOverviewFieldBriefingVocabulary";
import { OVERVIEW_VISIBILITY_STILL_FORMING } from "@/lib/surgical-sales/providerOverviewEarlyDiscoveryVocabulary";

/** Maturity-based visibility label for mission control metadata. */
export function resolveProviderOverviewVisibilityLabel(input: {
  visibilityState: OperationalVisibilityState;
  density: ProviderOverviewIntelligenceDensity;
  commercialStage?: ProviderCommercialWorkflowStage;
  status?: ProviderOverviewSimpleStatus;
}): string {
  return resolveProviderIntelligenceMaturityLabel({
    visibilityState: input.visibilityState,
    density: input.density,
    commercialStage: input.commercialStage ?? "early_discovery",
    status: input.status ?? "hold_field_time",
  }).label;
}

export type ProviderOverviewFieldReadiness = {
  label: string;
  hint: string;
};

export function buildProviderOverviewFieldReadiness(input: {
  status: ProviderOverviewSimpleStatus;
  fieldTimeState: ProviderFieldTimeRiskState;
  visibilityState: OperationalVisibilityState;
  density: ProviderOverviewIntelligenceDensity;
}): ProviderOverviewFieldReadiness {
  const visibilityLabel = operationalVisibilityStateLabel(input.visibilityState);

  if (input.density === "sparse") {
    return {
      label: OVERVIEW_VISIBILITY_STILL_FORMING,
      hint: PROVIDER_OVERVIEW_EARLY_VISIBILITY_HINT,
    };
  }

  if (input.status === "active_opportunity") {
    return {
      label: "Case support readiness developing",
      hint: "Live opportunity in motion — keep tactical notes tied to supported cases.",
    };
  }

  if (input.status === "ready_to_evaluate") {
    return {
      label: "Evaluation pathway developing",
      hint: "Product fit and workflow context are building — confirm evaluation logistics on next touch.",
    };
  }

  if (input.status === "ready_to_observe") {
    return {
      label: "Observation pathway developing",
      hint: "OR access and scheduling look workable — plan observation before heavier field days.",
    };
  }

  if (input.fieldTimeState === "worth_exploratory_visit") {
    return {
      label: "Workflow partially mapped",
      hint: "Light touch visits only until scheduling and access signals firm up.",
    };
  }

  if (input.visibilityState === "developing" || input.visibilityState === "strong") {
    return {
      label: "Workflow partially mapped",
      hint: `${visibilityLabel} — capture open items on your next touch.`,
    };
  }

  return {
    label: OVERVIEW_VISIBILITY_STILL_FORMING,
    hint: PROVIDER_OVERVIEW_EARLY_VISIBILITY_HINT,
  };
}
