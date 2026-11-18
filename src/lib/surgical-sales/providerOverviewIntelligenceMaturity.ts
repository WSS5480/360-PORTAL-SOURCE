/**
 * Operational maturity framing — progression language for provider overview.
 */

import type { ProviderOverviewIntelligenceDensity } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { OperationalVisibilityState } from "@/lib/surgical-sales/operationalVisibilityVocabulary";
import type { ProviderOverviewSimpleStatus } from "@/lib/surgical-sales/buildProviderOverviewSimpleView";
import { OVERVIEW_VISIBILITY_STILL_FORMING } from "@/lib/surgical-sales/providerOverviewEarlyDiscoveryVocabulary";

export type ProviderIntelligenceMaturityTone =
  | "early"
  | "developing"
  | "forming"
  | "building"
  | "ready";

export function resolveProviderIntelligenceMaturityLabel(input: {
  visibilityState: OperationalVisibilityState;
  density: ProviderOverviewIntelligenceDensity;
  commercialStage: ProviderCommercialWorkflowStage;
  status: ProviderOverviewSimpleStatus;
}): { label: string; tone: ProviderIntelligenceMaturityTone } {
  if (input.status === "active_opportunity") {
    return { label: "Field confidence increasing", tone: "ready" };
  }
  if (input.status === "ready_to_evaluate") {
    return { label: "Operational picture developing", tone: "building" };
  }
  if (input.status === "ready_to_observe") {
    return { label: "Observation viability forming", tone: "forming" };
  }

  if (input.density === "sparse" || input.visibilityState === "early") {
    return { label: OVERVIEW_VISIBILITY_STILL_FORMING, tone: "early" };
  }

  if (input.commercialStage === "observation") {
    return { label: "Workflow visibility emerging", tone: "developing" };
  }

  switch (input.visibilityState) {
    case "developing":
      return { label: "Workflow visibility emerging", tone: "developing" };
    case "strong":
      return { label: "Operational picture developing", tone: "building" };
    case "validated":
      return { label: "Field confidence increasing", tone: "ready" };
    default:
      return { label: OVERVIEW_VISIBILITY_STILL_FORMING, tone: "early" };
  }
}

export function operationalStatusPillLabel(
  commercialStage: ProviderCommercialWorkflowStage,
  stageLabel: string,
): string {
  const map: Record<ProviderCommercialWorkflowStage, string> = {
    early_discovery: "Early discovery",
    observation: "Observation ready",
    evaluation: "Evaluation active",
    adoption: "Case support active",
  };
  return map[commercialStage] ?? stageLabel;
}
