import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { hasExplicitPrepProductFocus } from "@/lib/surgical-sales/engagements/introCallProductAlignment";

/** Commercialization prep context — product + relationship + pipeline maturity */
export type EngagementPreparationContextState =
  | "discovery"
  | "product_exploration"
  | "evaluation_planning"
  | "observation_support";

export type EngagementPreparationContextInput = {
  engagementType: string;
  productLine?: string | null;
  opportunityProductLine?: string | null;
  opportunityId?: string | null;
  opportunityStage?: string | null;
  caseId?: string | null;
  providerRelationshipStage?: string | null;
};

const SUPPORT_ENGAGEMENT_TYPES = new Set<EngagementType>([
  "observation_request",
  "or_visit",
  "evaluation_follow_up",
]);

const EVALUATION_STAGES = new Set<SalesStage>([
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
]);

const ADOPTION_STAGES = new Set<SalesStage>([
  "outcome_review",
  "preference_card_progress",
  "adoption_expanding",
  "won",
]);

function isLegacyObservationRelationshipStage(raw: string | null | undefined): boolean {
  const key = String(raw ?? "").trim();
  return key === "observation_requested" || key === "observation_scheduled";
}

/**
 * Resolve preparation context (most specific wins).
 * 1 Discovery → 2 Product Exploration → 3 Evaluation Planning → 4 Observation / Support
 */
export function resolveEngagementPreparationContextState(
  input: EngagementPreparationContextInput,
): EngagementPreparationContextState {
  const engagementType = normalizeEngagementType(input.engagementType);
  const stage = normalizeSalesStage(input.opportunityStage);
  const hasProduct = hasExplicitPrepProductFocus(input.productLine);
  const hasOpportunity = Boolean(String(input.opportunityId ?? "").trim());
  const hasCase = Boolean(String(input.caseId ?? "").trim());
  if (
    hasCase ||
    (engagementType && SUPPORT_ENGAGEMENT_TYPES.has(engagementType)) ||
    (stage && ADOPTION_STAGES.has(stage)) ||
    (isLegacyObservationRelationshipStage(input.providerRelationshipStage) &&
      (hasCase || hasProduct))
  ) {
    return "observation_support";
  }

  if (
    (hasOpportunity && stage && EVALUATION_STAGES.has(stage)) ||
    (hasProduct && isLegacyObservationRelationshipStage(input.providerRelationshipStage))
  ) {
    return "evaluation_planning";
  }

  if (hasProduct) {
    return "product_exploration";
  }

  return "discovery";
}

export function usesProductSpecificPrepContent(state: EngagementPreparationContextState): boolean {
  return state === "product_exploration" || state === "evaluation_planning";
}
