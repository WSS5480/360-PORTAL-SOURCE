/**
 * Intelligence progression dashboard — deployment track + four evolution lanes.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderOperationalProgressionTimeline,
  type ProviderOperationalProgressionTimeline,
} from "@/lib/surgical-sales/buildProviderOperationalProgressionTimeline";
import {
  buildProviderIntelligenceProgressionLanes,
  type IntelligenceProgressionLane,
} from "@/lib/surgical-sales/buildProviderIntelligenceProgressionLanes";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  INTELLIGENCE_PROGRESSION_DASHBOARD_KICKER,
  INTELLIGENCE_PROGRESSION_DASHBOARD_TITLE,
} from "@/lib/surgical-sales/providerIntelligenceProgressionVocabulary";
import { maturityEvolutionBrief } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { ProviderIntelligenceMaturitySnapshot } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import { buildProviderIntelligenceMaturitySnapshot } from "@/lib/surgical-sales/providerIntelligenceMaturity";

export type ProviderIntelligenceProgressionDashboard = {
  title: string;
  kicker: string;
  /** One-line movement headline for workspace hero. */
  movementHeadline: string;
  evolutionBrief: string;
  deployment: ProviderOperationalProgressionTimeline;
  lanes: IntelligenceProgressionLane[];
};

export function buildProviderIntelligenceProgressionDashboard(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderIntelligenceProgressionDashboard {
  const ctx = {
    contact: input.contact,
    planning: input.planning,
    relationshipStage: input.relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  };

  const deployment = buildProviderOperationalProgressionTimeline(ctx);
  const maturity = buildProviderIntelligenceMaturitySnapshot(ctx);

  const lanes = buildProviderIntelligenceProgressionLanes({
    ctx,
    maturity,
    deploymentPhaseIndex: deployment.phases.findIndex((p) => p.status === "current"),
    deploymentPhaseLabels: deployment.phases.map((p) => p.label),
    deploymentMomentumPercent: deployment.momentumPercent,
    deploymentNextPhaseLabel: deployment.nextPhaseLabel,
    deploymentBlockedScan: deployment.blockedHeadline,
  });

  const movementHeadline = deployment.blockedHeadline
    ? deployment.blockedHeadline
    : deployment.nextPhaseLabel
      ? `${deployment.currentPhaseLabel} → ${deployment.nextPhaseLabel} (${deployment.momentumPercent}% through gate)`
      : deployment.currentPhaseLabel;

  return {
    title: INTELLIGENCE_PROGRESSION_DASHBOARD_TITLE,
    kicker: INTELLIGENCE_PROGRESSION_DASHBOARD_KICKER,
    movementHeadline,
    evolutionBrief: maturityEvolutionBrief(maturity),
    deployment,
    lanes,
  };
}
