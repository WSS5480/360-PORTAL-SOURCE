/**
 * Bundled data for the Provider Intelligence workspace top summary (10-second scan).
 */

import {
  buildProviderNextDiscoveryPriorities,
  NEXT_DISCOVERY_PRIORITIES_VISIBLE_DEFAULT,
} from "@/lib/surgical-sales/buildProviderNextDiscoveryPriorities";
import type { NextDiscoveryPriority } from "@/lib/surgical-sales/buildProviderNextDiscoveryPriorities";
import { buildProviderIntelligenceSummaryView } from "@/lib/surgical-sales/buildProviderIntelligenceSummaryView";
import type { IntelligenceStrengthLabel } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import {
  buildIntelligenceLearningGaps,
  type IntelligenceLearningGap,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  buildProviderIntelligenceStatusCards,
  type IntelligenceStatusCard,
} from "@/lib/surgical-sales/providerIntelligenceStatusCards";
import { formatOverallOperationalLabel } from "@/lib/surgical-sales/providerIntelligenceOperationalConfidence";
import { weakestSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { maturityEvolutionBrief } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { IntelligenceTrackId } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import {
  buildProviderIntelligenceMaturitySnapshot,
  PROVIDER_INTELLIGENCE_MATURITY_LABELS,
  type ProviderIntelligenceMaturitySnapshot,
  type ProviderIntelligenceMaturityStage,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import {
  PROVIDER_COMMERCIAL_WORKFLOW_STAGE_LABELS,
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { buildPriorityStaleFreshnessLines } from "@/lib/surgical-sales/providerIntelligenceFreshness";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

export type IntelligenceWorkspaceSummary = {
  /** One-line briefing label (default view). */
  commercialBrief: string;
  /** Full sentence — expanded detail / tooltips only. */
  commercialDetail: string;
  overallStatus: IntelligenceStrengthLabel;
  overallConfidenceLabel: string;
  workflowStage: ProviderCommercialWorkflowStage;
  workflowStageLabel: string;
  maturity: ProviderIntelligenceMaturitySnapshot;
  maturityStage: ProviderIntelligenceMaturityStage;
  maturityStageLabel: string;
  weakestTrackId: IntelligenceTrackId;
  statusCards: IntelligenceStatusCard[];
  missingSignals: IntelligenceLearningGap[];
  discoveryActions: NextDiscoveryPriority[];
  discoveryActionsVisibleCount: number;
  staleFreshnessWarnings: string[];
};

function commercialDetail(
  overallStatus: IntelligenceStrengthLabel,
  weakestTrackId: IntelligenceTrackId,
): string {
  if (overallStatus === "Strong") {
    return "Procedure, influence, and competitive context are in shape.";
  }
  if (overallStatus === "Limited") {
    if (weakestTrackId === "clinical") {
      return "Case mix and observation path still need a baseline.";
    }
    if (weakestTrackId === "relationship") {
      return "Relationship and deployment path not operationally mature yet.";
    }
    return "Vendor access and trial willingness are still open.";
  }
  if (weakestTrackId === "clinical") {
    return "Tighten clinical and observation signals on the next touch.";
  }
  if (weakestTrackId === "relationship") {
    return "Influence and engagement rhythm still forming.";
  }
  if (weakestTrackId === "product_competitor") {
    return "Confirm incumbents and evaluation appetite while access is warm.";
  }
  return "Close the weakest lane on your next visit.";
}

export function buildIntelligenceWorkspaceSummary(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): IntelligenceWorkspaceSummary | null {
  if (!input.planning) return null;

  const view = buildProviderIntelligenceSummaryView({
    contact: input.contact,
    planning: input.planning,
  });

  const weakestTrack = [...view.tracks].sort((a, b) => a.percent - b.percent)[0];
  const weakestTrackId = (weakestTrack?.id ?? "clinical") as IntelligenceTrackId;
  const overallConfidence = weakestSectionConfidence(
    input.planning.sections.map((s) => s.confidence),
  );
  const relationshipStage = String(
    input.relationshipStage ?? input.contact.provider_relationship_stage ?? "prospect",
  )
    .trim()
    .toLowerCase();
  const workflowStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });

  const fieldMetadata = parseProviderIntelligenceFieldMetadata(
    input.contact.provider_intelligence_field_metadata,
  );
  const staleFreshnessWarnings = buildPriorityStaleFreshnessLines(
    input.contact,
    fieldMetadata,
    3,
  );
  const statusCards = buildProviderIntelligenceStatusCards(
    input.contact,
    input.planning,
    fieldMetadata,
  );
  const maturity = buildProviderIntelligenceMaturitySnapshot({
    contact: input.contact,
    planning: input.planning,
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });

  return {
    commercialBrief: maturityEvolutionBrief(maturity),
    commercialDetail: commercialDetail(view.overallStatus, weakestTrackId),
    overallStatus: view.overallStatus,
    overallConfidenceLabel: formatOverallOperationalLabel(
      statusCards,
      weakestTrackId,
      overallConfidence,
    ),
    workflowStage,
    workflowStageLabel: PROVIDER_COMMERCIAL_WORKFLOW_STAGE_LABELS[workflowStage],
    maturity,
    maturityStage: maturity.stage,
    maturityStageLabel: PROVIDER_INTELLIGENCE_MATURITY_LABELS[maturity.stage],
    weakestTrackId,
    statusCards,
    missingSignals: buildIntelligenceLearningGaps(input.contact, input.planning, 3),
    discoveryActions: buildProviderNextDiscoveryPriorities({
      contact: input.contact,
      planning: input.planning,
      specialty: input.specialty,
      relationshipStage: input.relationshipStage,
      engagements: input.engagements,
      opportunities: input.opportunities,
      cases: input.cases,
    }).filter((p) => p.priorityScore > 0),
    discoveryActionsVisibleCount: NEXT_DISCOVERY_PRIORITIES_VISIBLE_DEFAULT,
    staleFreshnessWarnings,
  };
}
