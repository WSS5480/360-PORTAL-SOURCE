/**
 * Sales pathway execution — rep-facing six-stage field motion (not CRM dashboard).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceMaturitySnapshot } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderFieldTimeRiskState } from "@/lib/surgical-sales/providerFieldTimeRiskVocabulary";
import type { OperationalVisibilityState } from "@/lib/surgical-sales/operationalVisibilityVocabulary";
import { heroVisibilityShort } from "@/lib/surgical-sales/providerOverviewMissionPresentation";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

function pathwayRequirementLabel(label: string): string {
  return label
    .replace(/\bcommercial influence\b/gi, "stakeholder influence")
    .replace(/\bblockers?\b/gi, "gaps")
    .trim();
}

export {
  SALES_PATHWAY_STAGE_IDS,
  SALES_PATHWAY_STAGE_LABELS,
  SALES_PATHWAY_STAGE_OBJECTIVES,
  SALES_PATHWAY_STAGE_SHORT_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

export {
  deriveSalesPathwayState,
  salesPathwayWorkspaceHref,
  isPathwayStageUnlocked,
  type SalesPathwayState,
} from "@/lib/surgical-sales/deriveSalesPathwayState";

export { isProductSalesConversationAllowed } from "@/lib/surgical-sales/pathwayStageGates";

import {
  SALES_PATHWAY_STAGE_IDS,
  SALES_PATHWAY_STAGE_LABELS,
  SALES_PATHWAY_STAGE_OBJECTIVES,
  SALES_PATHWAY_STAGE_RANK,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import {
  resolveSalesPathwayStage as resolveSalesPathwayStageFromPathway,
  resolveSalesPathwayStageFromProviderRow,
} from "@/lib/surgical-sales/pathway/resolveSalesPathwayStage";
import {
  buildPathwayStageGateRequirements,
} from "@/lib/surgical-sales/pathway/pathwayProgressionPolicy";

export {
  SALES_PATHWAY_OFFICIAL_STAGE_ORDER,
  SALES_PATHWAY_STAGE_GOALS,
  SALES_PATHWAY_EVALUATION_ACTIVITY_LABELS,
  SALES_PATHWAY_TRANSITION_RULES,
  SALES_PATHWAY_NON_ADVANCING_EVENTS,
  isNonAdvancingPathwayEvent,
  nextSalesPathwayStage,
  salesPathwayStageGoal,
} from "@/lib/surgical-sales/pathway/salesPathwayRules";

export { resolveSalesPathwayStageFromProviderRow };

export function resolveSalesPathwayStage(input: {
  relationshipStage?: string | null;
  commercialStage?: ProviderCommercialWorkflowStage;
  contact?: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): SalesPathwayStageId {
  return resolveSalesPathwayStageFromPathway({
    contact: input.contact ?? {},
    engagements: input.engagements,
    cases: input.cases,
  });
}

export function salesPathwayRiskLevel(fieldTimeState: ProviderFieldTimeRiskState): string {
  switch (fieldTimeState) {
    case "efficient_field_target":
      return "Low";
    case "worth_exploratory_visit":
      return "Medium";
    case "requires_remote_validation_first":
      return "High";
    case "high_wasted_field_risk":
      return "High";
    default:
      return "Medium";
  }
}

export function salesPathwayConfidenceLevel(visibilityState: OperationalVisibilityState): string {
  return heroVisibilityShort(visibilityState);
}

export type SalesPathwayRequirement = {
  label: string;
  met: boolean;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
};

export type SalesPathwayTimelinePhase = {
  id: SalesPathwayStageId;
  label: string;
  status: "complete" | "current" | "upcoming";
};

export function buildSalesPathwayTimeline(currentStageId: SalesPathwayStageId): SalesPathwayTimelinePhase[] {
  const currentIndex = SALES_PATHWAY_STAGE_RANK[currentStageId];
  return SALES_PATHWAY_STAGE_IDS.map((id) => {
    const order = SALES_PATHWAY_STAGE_RANK[id];
    let status: SalesPathwayTimelinePhase["status"] = "upcoming";
    if (order < currentIndex) status = "complete";
    else if (order === currentIndex) status = "current";
    return {
      id,
      label: SALES_PATHWAY_STAGE_LABELS[id],
      status,
    };
  });
}

export function buildSalesPathwayRequirements(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  maturity?: ProviderIntelligenceMaturitySnapshot;
}): SalesPathwayRequirement[] {
  void input.maturity;
  void input.planning;
  void input.opportunities;

  const stageId = resolveSalesPathwayStage({
    relationshipStage: input.relationshipStage,
    contact: input.contact,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const gateInput = {
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
  };

  return buildPathwayStageGateRequirements(stageId, gateInput).map((req) => ({
    label: pathwayRequirementLabel(req.label),
    met: req.met,
    dbKey: req.dbKey,
    sectionId: req.sectionId,
  }));
}

export function salesPathwayProgressPercent(input: {
  requirements: SalesPathwayRequirement[];
  maturity?: ProviderIntelligenceMaturitySnapshot;
}): number {
  void input.maturity;
  const reqs = input.requirements;
  if (reqs.length === 0) return 0;
  const met = reqs.filter((r) => r.met).length;
  return Math.round((met / reqs.length) * 100);
}
