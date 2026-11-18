/**
 * Operational Visibility — qualitative field confidence (not pass/fail readiness or completion %).
 */

import type { DeploymentConfidenceTier } from "@/lib/surgical-sales/commercialDeploymentReadiness";
import type { IntelligenceCardReadinessTone } from "@/lib/surgical-sales/providerIntelligenceCardStatus";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderOverviewOperationalState } from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import { formatOpenItemsCount } from "@/lib/surgical-sales/discoveryOpenItemsVocabulary";
import { OVERVIEW_VISIBILITY_STILL_FORMING } from "@/lib/surgical-sales/providerOverviewEarlyDiscoveryVocabulary";

export const OPERATIONAL_VISIBILITY_LABEL = "Workflow visibility";

/** @deprecated Overview uses CURRENT_VISIBILITY_LEVEL_LABEL */
export const OPERATIONAL_VISIBILITY_LEGACY_LABEL = "Operational Visibility";

export const CURRENT_VISIBILITY_LEVEL_LABEL = "Current visibility level";

export const OPERATIONAL_VISIBILITY_BECAUSE_KICKER = "Discovery progress";

export const OPERATIONAL_VISIBILITY_GUIDANCE =
  "Guides your next field move — learning continues with each touch.";

export type OperationalVisibilityState = "early" | "developing" | "strong" | "validated";

export const OPERATIONAL_VISIBILITY_STATE_LABELS: Record<OperationalVisibilityState, string> = {
  early: OVERVIEW_VISIBILITY_STILL_FORMING,
  developing: "Developing visibility",
  strong: "Workflow mostly mapped",
  validated: "Field-ready context",
};

const STATE_RANK: Record<OperationalVisibilityState, number> = {
  early: 0,
  developing: 1,
  strong: 2,
  validated: 3,
};

export function deploymentTierToVisibilityState(
  tier: DeploymentConfidenceTier,
): OperationalVisibilityState {
  switch (tier) {
    case "low":
      return "early";
    case "building":
      return "developing";
    case "high":
      return "strong";
    default:
      return "developing";
  }
}

export function sectionConfidenceToVisibilityState(
  confidence: IntelligenceSectionConfidence,
): OperationalVisibilityState {
  switch (confidence) {
    case "unknown":
      return "early";
    case "partial":
      return "developing";
    case "confirmed":
      return "strong";
    case "validated":
      return "validated";
    default:
      return "developing";
  }
}

export function cardToneToVisibilityState(tone: IntelligenceCardReadinessTone): OperationalVisibilityState {
  switch (tone) {
    case "not_started":
      return "early";
    case "unmapped":
    case "partial":
      return "developing";
    case "confirmed":
      return "strong";
    case "operationally_ready":
      return "validated";
    default:
      return "developing";
  }
}

export function overviewOperationalStateToVisibility(
  state: ProviderOverviewOperationalState,
): OperationalVisibilityState {
  switch (state) {
    case "emerging":
      return "early";
    case "partially_validated":
      return "developing";
    case "operationally_viable":
    case "observation_ready":
    case "evaluation_active":
      return "strong";
    case "adoption_building":
      return "validated";
    default:
      return "developing";
  }
}

/** Conservative combined state — lowest visibility across dimensions. */
export function combineVisibilityStates(states: OperationalVisibilityState[]): OperationalVisibilityState {
  if (states.length === 0) return "early";
  return states.reduce((min, s) => (STATE_RANK[s] < STATE_RANK[min] ? s : min));
}

export function operationalVisibilityStateLabel(state: OperationalVisibilityState): string {
  return OPERATIONAL_VISIBILITY_STATE_LABELS[state];
}

/** Rep-facing fragment for "Because" bullets from a dimension state. */
export function visibilityBecauseFragment(
  dimensionLabel: string,
  state: OperationalVisibilityState,
): string {
  switch (state) {
    case "early":
      return `${dimensionLabel} not yet understood`;
    case "developing":
      return `${dimensionLabel} partially understood`;
    case "strong":
      return `${dimensionLabel} mostly clear for field planning`;
    case "validated":
      return `${dimensionLabel} validated on file`;
    default:
      return `${dimensionLabel} still being learned`;
  }
}

/** Metrics line for cards — visibility depth, not form completion. */
export function operationalVisibilityMetricsLine(input: {
  signalsOnFile: number;
  openQuestions: number;
  state: OperationalVisibilityState;
}): string {
  const parts: string[] = [];
  if (input.signalsOnFile > 0) {
    parts.push(
      `${input.signalsOnFile} signal${input.signalsOnFile === 1 ? "" : "s"} on file`,
    );
  }
  if (input.openQuestions > 0) {
    parts.push(formatOpenItemsCount(input.openQuestions));
  }
  if (parts.length === 0) {
    return operationalVisibilityStateLabel(input.state);
  }
  return parts.join(" · ");
}

/** Explain internal confidence index when shown — not a completion score. */
export function formatVisibilityConfidenceIndex(index: number): string {
  return `${Math.round(index)}% field visibility`;
}
