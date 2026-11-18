/**
 * Commercial workflow stage — drives which provider overview / intelligence surfaces
 * are operationally relevant (vs. showing full enterprise empty-state scaffolding).
 */

import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import {
  isUpcomingEngagementStatus,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { engagementHasLoggedExecutionOutcome } from "@/lib/surgical-sales/relationshipStageProgression";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { IntelligenceTrackId } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";

export const PROVIDER_COMMERCIAL_WORKFLOW_STAGES = [
  "early_discovery",
  "observation",
  "evaluation",
  "adoption",
] as const;

export type ProviderCommercialWorkflowStage = (typeof PROVIDER_COMMERCIAL_WORKFLOW_STAGES)[number];

export const PROVIDER_COMMERCIAL_WORKFLOW_STAGE_LABELS: Record<ProviderCommercialWorkflowStage, string> = {
  early_discovery: "Early discovery",
  observation: "Observation",
  evaluation: "Evaluation",
  adoption: "Adoption",
};

export const PROVIDER_COMMERCIAL_WORKFLOW_STAGE_HINTS: Record<ProviderCommercialWorkflowStage, string> = {
  early_discovery: "Relationship, workflow hints, observation pathway, and next engagement.",
  observation: "OR access, workflow notes, case cadence, and observation history.",
  evaluation: "Product fit, evaluation logistics, stakeholder map, and trial readiness.",
  adoption: "Supported cases, opportunities, repeat use patterns, and expansion opportunities.",
};

/** Imperative mission line for overview narrative (field briefing). */
export const PROVIDER_COMMERCIAL_WORKFLOW_STAGE_MISSION: Record<ProviderCommercialWorkflowStage, string> = {
  early_discovery:
    "Early discovery — learn workflow, confirm access, and identify realistic next steps.",
  observation:
    "Map OR workflow, confirm observation access, and build a repeatable observation cadence.",
  evaluation:
    "Clarify product fit, evaluation logistics, and who moves the trial forward.",
  adoption:
    "Track supported cases, preference-card progress, and tactical case-day readiness.",
};

const STAGE_RANK: Record<ProviderCommercialWorkflowStage, number> = {
  early_discovery: 0,
  observation: 1,
  evaluation: 2,
  adoption: 3,
};

const RELATIONSHIP_STAGE_BASE: Record<string, ProviderCommercialWorkflowStage> = {
  early_discovery: "early_discovery",
  active_evaluation: "evaluation",
  active_relationship: "evaluation",
  established_customer: "adoption",
  dormant: "early_discovery",
  archived: "early_discovery",
  prospect: "early_discovery",
  pre_call_planning: "early_discovery",
  engagement_active: "evaluation",
  observation_requested: "observation",
  observation_scheduled: "observation",
};

const OPPORTUNITY_STAGE_FLOOR: Partial<Record<SalesStage, ProviderCommercialWorkflowStage>> = {
  discovery: "early_discovery",
  clinical_validation: "observation",
  evaluation_planned: "evaluation",
  evaluation_active: "evaluation",
  outcome_review: "evaluation",
  preference_card_progress: "adoption",
  adoption_expanding: "adoption",
  won: "adoption",
};

const OBSERVATION_ENGAGEMENT_TYPES = new Set([
  "observation_request",
  "or_visit",
  "or_observation",
]);

const COMPLETED_EXECUTION_STATUSES = new Set(["completed", "done", "closed"]);

export type ProviderOverviewSectionId =
  | "intelligence_summary"
  | "relationship"
  | "observation_readiness"
  | "upcoming_engagement"
  | "cases_work"
  | "engagements_feed"
  | "activity_feed"
  | "contact_details";

export type ProviderOverviewVisibilityContext = {
  hasCases: boolean;
  hasOpportunities: boolean;
  hasEngagementHistory: boolean;
  hasActivity: boolean;
};

const OVERVIEW_SECTIONS_BY_STAGE: Record<ProviderCommercialWorkflowStage, ReadonlySet<ProviderOverviewSectionId>> = {
  early_discovery: new Set([
    "intelligence_summary",
    "relationship",
    "observation_readiness",
    "upcoming_engagement",
  ]),
  observation: new Set([
    "intelligence_summary",
    "observation_readiness",
    "upcoming_engagement",
    "cases_work",
    "engagements_feed",
    "activity_feed",
  ]),
  evaluation: new Set([
    "intelligence_summary",
    "relationship",
    "upcoming_engagement",
    "cases_work",
    "engagements_feed",
    "activity_feed",
  ]),
  adoption: new Set([
    "intelligence_summary",
    "relationship",
    "upcoming_engagement",
    "cases_work",
    "engagements_feed",
    "activity_feed",
  ]),
};

function maxCommercialStage(
  ...stages: ProviderCommercialWorkflowStage[]
): ProviderCommercialWorkflowStage {
  return stages.reduce((best, next) => (STAGE_RANK[next] > STAGE_RANK[best] ? next : best));
}

export function resolveProviderCommercialWorkflowStage(input: {
  relationshipStage?: string | null;
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
}): ProviderCommercialWorkflowStage {
  const relKey = String(input.relationshipStage || "prospect").trim().toLowerCase();
  let stage = RELATIONSHIP_STAGE_BASE[relKey] ?? "early_discovery";

  for (const row of input.opportunities ?? []) {
    const oppStage = normalizeSalesStage(String(row.stage || ""));
    if (!oppStage) continue;
    const floor = OPPORTUNITY_STAGE_FLOOR[oppStage];
    if (floor) stage = maxCommercialStage(stage, floor);
  }

  const hasCompletedObservationCase = (input.cases ?? []).some(
    (c) =>
      String(c.case_type || "").toLowerCase() === "observation" &&
      COMPLETED_EXECUTION_STATUSES.has(String(c.status || "").toLowerCase()),
  );
  if (hasCompletedObservationCase) {
    stage = maxCommercialStage(stage, "observation");
  }

  const hasCompletedObservationExecution = (input.engagements ?? []).some(
    (e) =>
      OBSERVATION_ENGAGEMENT_TYPES.has(String(e.engagement_type || "").toLowerCase()) &&
      COMPLETED_EXECUTION_STATUSES.has(String(e.status || "").toLowerCase()) &&
      engagementHasLoggedExecutionOutcome(e),
  );
  if (hasCompletedObservationExecution && STAGE_RANK[stage] < STAGE_RANK.observation) {
    stage = "observation";
  }

  return stage;
}

export function buildProviderOverviewVisibilityContext(input: {
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  activity_timeline?: Array<Record<string, unknown>>;
}): ProviderOverviewVisibilityContext {
  const engagements = input.engagements ?? [];
  return {
    hasCases: (input.cases?.length ?? 0) > 0,
    hasOpportunities: (input.opportunities?.length ?? 0) > 0,
    hasEngagementHistory: engagements.some((e) => !isUpcomingEngagementStatus(e.status)),
    hasActivity: (input.activity_timeline?.length ?? 0) > 0,
  };
}

/** Show section when stage-relevant, or when real data exists (avoids hiding populated advanced panels). */
export function isProviderOverviewSectionVisible(
  sectionId: ProviderOverviewSectionId,
  stage: ProviderCommercialWorkflowStage,
  ctx: ProviderOverviewVisibilityContext,
): boolean {
  if (sectionId === "contact_details") return true;
  if (OVERVIEW_SECTIONS_BY_STAGE[stage].has(sectionId)) return true;

  if (sectionId === "cases_work") {
    return ctx.hasCases || ctx.hasOpportunities;
  }
  if (sectionId === "engagements_feed") return ctx.hasEngagementHistory;
  if (sectionId === "activity_feed") return ctx.hasActivity;

  return false;
}

export type ProviderOverviewWorkPreviewMode = {
  showCases: boolean;
  showOpportunities: boolean;
};

export function providerOverviewWorkPreviewMode(
  stage: ProviderCommercialWorkflowStage,
  ctx: ProviderOverviewVisibilityContext,
): ProviderOverviewWorkPreviewMode {
  switch (stage) {
    case "early_discovery":
      return {
        showCases: ctx.hasCases,
        showOpportunities: ctx.hasOpportunities,
      };
    case "observation":
      return {
        showCases: true,
        showOpportunities: ctx.hasOpportunities,
      };
    case "evaluation":
    case "adoption":
      return {
        showCases: ctx.hasCases,
        showOpportunities: ctx.hasOpportunities,
      };
    default:
      return { showCases: true, showOpportunities: true };
  }
}

export function intelligenceTrackIdsForCommercialStage(
  stage: ProviderCommercialWorkflowStage,
): IntelligenceTrackId[] {
  switch (stage) {
    case "early_discovery":
    case "observation":
      return ["clinical"];
    case "evaluation":
      return ["relationship", "product_competitor"];
    case "adoption":
      return ["product_competitor", "relationship"];
    default:
      return ["clinical", "relationship", "product_competitor"];
  }
}

export function isIntelligenceSectionVisibleForCommercialStage(
  sectionId: ProviderIntelligenceSectionId,
  stage: ProviderCommercialWorkflowStage,
): boolean {
  switch (stage) {
    case "early_discovery":
      return sectionId === "observation_readiness" || sectionId === "clinical_workflow";
    case "observation":
      return (
        sectionId === "observation_readiness" ||
        sectionId === "clinical_workflow" ||
        sectionId === "or_environment"
      );
    case "evaluation":
      return sectionId === "relationship_intelligence" || sectionId === "commercial_signals";
    case "adoption":
      return (
        sectionId === "commercial_signals" ||
        sectionId === "relationship_intelligence" ||
        sectionId === "clinical_workflow"
      );
    default:
      return true;
  }
}
