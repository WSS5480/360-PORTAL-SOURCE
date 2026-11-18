/**
 * Qualitative operational readiness — procedural account states (no scores or percentages).
 */

import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { intelligenceCaptureHasSignal } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { buildProviderRelationshipOperationalMaturity } from "@/lib/surgical-sales/buildProviderRelationshipOperationalMaturity";
import {
  deriveIntelligenceSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  PROVIDER_OPS_TERM,
  PROVIDER_OVERVIEW_READINESS_DIMENSION_LABELS,
} from "@/lib/surgical-sales/providerOverviewVocabulary";
import {
  operationalVisibilityStateLabel,
  overviewOperationalStateToVisibility,
  visibilityBecauseFragment,
} from "@/lib/surgical-sales/operationalVisibilityVocabulary";

export const PROVIDER_OVERVIEW_OPERATIONAL_STATES = [
  "emerging",
  "partially_validated",
  "operationally_viable",
  "observation_ready",
  "evaluation_active",
  "adoption_building",
] as const;

export type ProviderOverviewOperationalState = (typeof PROVIDER_OVERVIEW_OPERATIONAL_STATES)[number];

export type ProviderOverviewReadinessDimensionId =
  | "observation_readiness"
  | "commercial_influence"
  | "workflow_understanding"
  | "relationship_maturity";

export { PROVIDER_OVERVIEW_READINESS_DIMENSION_LABELS };

export const PROVIDER_OVERVIEW_OPERATIONAL_STATE_LABELS: Record<
  ProviderOverviewOperationalState,
  string
> = {
  emerging: operationalVisibilityStateLabel("early"),
  partially_validated: operationalVisibilityStateLabel("developing"),
  operationally_viable: operationalVisibilityStateLabel("strong"),
  observation_ready: operationalVisibilityStateLabel("strong"),
  evaluation_active: operationalVisibilityStateLabel("strong"),
  adoption_building: operationalVisibilityStateLabel("validated"),
};

export type ProviderOverviewReadinessIndicator = {
  id: ProviderOverviewReadinessDimensionId;
  label: string;
  state: ProviderOverviewOperationalState;
  stateLabel: string;
  /** Optional procedural context (no percentages). */
  context: string | null;
};

export function overviewIndicatorBecauseLine(
  indicator: Pick<ProviderOverviewReadinessIndicator, "label" | "state" | "context">,
): string {
  const visibility = overviewOperationalStateToVisibility(indicator.state);
  if (indicator.context?.trim()) {
    const ctx = indicator.context.trim();
    if (ctx.length <= 88) return ctx.endsWith(".") ? ctx.slice(0, -1) : ctx;
    return visibilityBecauseFragment(indicator.label, visibility);
  }
  return visibilityBecauseFragment(indicator.label, visibility);
}

const CONFIDENCE_RANK: Record<IntelligenceSectionConfidence, number> = {
  unknown: 0,
  partial: 1,
  confirmed: 2,
  validated: 3,
};

const OBSERVATION_RELATIONSHIP_STAGES = new Set([
  "observation_requested",
  "observation_scheduled",
]);

const EVALUATION_OPPORTUNITY_STAGES = new Set<SalesStage>([
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
  "outcome_review",
]);

const ADOPTION_OPPORTUNITY_STAGES = new Set<SalesStage>([
  "preference_card_progress",
  "adoption_expanding",
  "won",
]);

function weakestConfidence(
  ...confidences: IntelligenceSectionConfidence[]
): IntelligenceSectionConfidence {
  return confidences.reduce((weakest, next) =>
    CONFIDENCE_RANK[next] < CONFIDENCE_RANK[weakest] ? next : weakest,
  );
}

function baseProgressionState(confidence: IntelligenceSectionConfidence): ProviderOverviewOperationalState {
  if (confidence === "unknown") return "emerging";
  if (confidence === "partial") return "partially_validated";
  return "operationally_viable";
}

function opportunitiesInStages(
  opportunities: Array<Record<string, unknown>> | undefined,
  stages: Set<SalesStage>,
): boolean {
  return (opportunities ?? []).some((o) => {
    const stage = normalizeSalesStage(String(o.stage || ""));
    return Boolean(stage && stages.has(stage));
  });
}

function resolveObservationReadinessState(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements: ProviderEngagementSummary[];
}): ProviderOverviewOperationalState {
  const confidence = deriveIntelligenceSectionConfidence("observation_readiness", input.contact)
    .confidence;
  const rel = input.relationshipStage.trim().toLowerCase();
  const feasibilityCaptured = intelligenceCaptureHasSignal(
    "provider_observation_feasibility",
    String(input.contact.provider_observation_feasibility ?? ""),
  );
  const hasObservationEngagement = input.engagements.some((e) =>
    ["observation_request", "or_visit", "or_observation"].includes(
      String(e.engagement_type || "").toLowerCase(),
    ),
  );

  if (
    confidence === "validated" ||
    (confidence === "confirmed" &&
      (OBSERVATION_RELATIONSHIP_STAGES.has(rel) || (feasibilityCaptured && hasObservationEngagement)))
  ) {
    return "observation_ready";
  }

  if (input.commercialStage === "observation" && confidence === "confirmed" && feasibilityCaptured) {
    return "observation_ready";
  }

  return baseProgressionState(confidence);
}

function resolveCommercialInfluenceState(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  opportunities?: Array<Record<string, unknown>>;
}): ProviderOverviewOperationalState {
  const confidence = deriveIntelligenceSectionConfidence("commercial_signals", input.contact)
    .confidence;
  const hasEval = opportunitiesInStages(input.opportunities, EVALUATION_OPPORTUNITY_STAGES);
  const hasAdoption = opportunitiesInStages(input.opportunities, ADOPTION_OPPORTUNITY_STAGES);

  if (input.commercialStage === "adoption") {
    if (hasAdoption || confidence === "validated") return "adoption_building";
    if (confidence === "confirmed") return "operationally_viable";
    return baseProgressionState(confidence);
  }

  if (input.commercialStage === "evaluation") {
    if (hasEval || confidence === "validated" || confidence === "confirmed") {
      return "evaluation_active";
    }
    return baseProgressionState(confidence);
  }

  if (input.commercialStage === "observation" && confidence === "confirmed") {
    return "operationally_viable";
  }

  return baseProgressionState(confidence);
}

function resolveWorkflowUnderstandingState(contact: Record<string, unknown>): ProviderOverviewOperationalState {
  const clinical = deriveIntelligenceSectionConfidence("clinical_workflow", contact).confidence;
  const orEnv = deriveIntelligenceSectionConfidence("or_environment", contact).confidence;
  const confidence = weakestConfidence(clinical, orEnv);

  if (confidence === "validated") return "operationally_viable";
  return baseProgressionState(confidence);
}

function resolveRelationshipMaturityState(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
}): ProviderOverviewOperationalState {
  const confidence = deriveIntelligenceSectionConfidence("relationship_intelligence", input.contact)
    .confidence;
  const strength = String(input.contact.relationship_strength || "unknown").trim().toLowerCase();
  const rel = input.relationshipStage.trim().toLowerCase();

  if (
    confidence === "validated" ||
    strength === "strong" ||
    rel === "established_customer" ||
    rel === "active_relationship"
  ) {
    return "operationally_viable";
  }

  if (confidence === "confirmed" || strength === "medium" || rel === "engagement_active") {
    return "partially_validated";
  }

  if (confidence === "partial" || strength === "weak") {
    return "partially_validated";
  }

  return "emerging";
}

function proceduralContext(
  dimension: ProviderOverviewReadinessDimensionId,
  state: ProviderOverviewOperationalState,
  contact: Record<string, unknown>,
): string | null {
  if (state === "emerging") {
    switch (dimension) {
      case "observation_readiness":
        return `${PROVIDER_OPS_TERM.orAccess} and ${PROVIDER_OPS_TERM.observationPathway} not yet established on file.`;
      case "commercial_influence":
        return `${PROVIDER_OPS_TERM.commercialInfluence} and evaluation appetite still thin.`;
      case "workflow_understanding":
        return `${PROVIDER_OPS_TERM.workflowIntelligence} not yet mapped for this account.`;
      case "relationship_maturity":
        return buildProviderRelationshipOperationalMaturity(contact).headline;
    }
  }

  if (state === "observation_ready") {
    return `${PROVIDER_OPS_TERM.orAccess}, ${PROVIDER_OPS_TERM.schedulingAuthority}, and pathway signals support field observation.`;
  }
  if (state === "evaluation_active") {
    return "Evaluation motion is live — align trials to documented operational risk.";
  }
  if (state === "adoption_building") {
    return "Adoption and preference-card work is the operating focus.";
  }

  if (state === "operationally_viable") {
    switch (dimension) {
      case "observation_readiness":
        return intelligenceCaptureHasSignal(
          "provider_observation_feasibility",
          String(contact.provider_observation_feasibility ?? ""),
        )
          ? "Observation allowance captured — confirm access gates before scheduling."
          : "Enough observation signals to plan the next field touch.";
      default:
        return null;
    }
  }

  return null;
}

export function buildProviderOverviewQualitativeReadiness(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
}): ProviderOverviewReadinessIndicator[] {
  const engagements = input.engagements ?? [];
  const dimensions: ProviderOverviewReadinessDimensionId[] = [
    "observation_readiness",
    "commercial_influence",
    "workflow_understanding",
    "relationship_maturity",
  ];

  const stateByDimension: Record<ProviderOverviewReadinessDimensionId, ProviderOverviewOperationalState> =
    {
      observation_readiness: resolveObservationReadinessState({
        contact: input.contact,
        relationshipStage: input.relationshipStage,
        commercialStage: input.commercialStage,
        engagements,
      }),
      commercial_influence: resolveCommercialInfluenceState({
        contact: input.contact,
        commercialStage: input.commercialStage,
        opportunities: input.opportunities,
      }),
      workflow_understanding: resolveWorkflowUnderstandingState(input.contact),
      relationship_maturity: resolveRelationshipMaturityState({
        contact: input.contact,
        relationshipStage: input.relationshipStage,
        commercialStage: input.commercialStage,
      }),
    };

  return dimensions.map((id) => {
    const state = stateByDimension[id];
    return {
      id,
      label: PROVIDER_OVERVIEW_READINESS_DIMENSION_LABELS[id] as string,
      state,
      stateLabel: PROVIDER_OVERVIEW_OPERATIONAL_STATE_LABELS[state],
      context: proceduralContext(id, state, input.contact),
    };
  });
}
