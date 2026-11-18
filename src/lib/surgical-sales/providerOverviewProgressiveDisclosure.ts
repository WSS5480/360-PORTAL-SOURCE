/**
 * Progressive disclosure for provider overview work streams (cases, initiatives, adoption).
 * Hides immature systems; shows contextual guidance instead of "0 items" empty states.
 */

import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  buildProviderOverviewVisibilityContext,
  type ProviderOverviewVisibilityContext,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";

export type ProviderOverviewWorkStreamId = "cases" | "initiatives" | "evaluation_tracking" | "adoption_workflow";

export type ProviderOverviewWorkStreamMode = "hidden" | "data" | "guidance";

export type ProviderOverviewWorkStream = {
  id: ProviderOverviewWorkStreamId;
  title: string;
  mode: ProviderOverviewWorkStreamMode;
  /** Contextual copy when mode is guidance (no counts, no guilt). */
  guidance?: string;
  actionHref?: string;
  actionLabel?: string;
};

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

const OBSERVATION_RELATIONSHIP_STAGES = new Set([
  "observation_requested",
  "observation_scheduled",
]);

function countCompletedEngagements(engagements: ProviderEngagementSummary[]): number {
  return engagements.filter((e) => String(e.status || "").toLowerCase() === "completed").length;
}

function opportunitiesInStages(
  opportunities: Array<Record<string, unknown>>,
  stages: Set<SalesStage>,
): boolean {
  return opportunities.some((o) => {
    const stage = normalizeSalesStage(String(o.stage || ""));
    return Boolean(stage && stages.has(stage));
  });
}

function hasEvaluationActivity(input: {
  commercialStage: ProviderCommercialWorkflowStage;
  opportunities: Array<Record<string, unknown>>;
  completedEngagements: number;
}): boolean {
  if (input.commercialStage === "evaluation" || input.commercialStage === "adoption") {
    return true;
  }
  if (opportunitiesInStages(input.opportunities, EVALUATION_OPPORTUNITY_STAGES)) {
    return true;
  }
  return input.completedEngagements > 0;
}

function hasAdoptionWorkflowMaturity(input: {
  commercialStage: ProviderCommercialWorkflowStage;
  opportunities: Array<Record<string, unknown>>;
}): boolean {
  if (input.commercialStage === "adoption") return true;
  return opportunitiesInStages(input.opportunities, ADOPTION_OPPORTUNITY_STAGES);
}

function casesStream(input: {
  commercialStage: ProviderCommercialWorkflowStage;
  ctx: ProviderOverviewVisibilityContext;
  relationshipStage: string;
  hasObservationCase: boolean;
  newCaseHref: string;
}): ProviderOverviewWorkStream {
  const rel = input.relationshipStage.trim().toLowerCase();
  const observationPath =
    OBSERVATION_RELATIONSHIP_STAGES.has(rel) ||
    input.commercialStage === "observation" ||
    input.hasObservationCase;

  if (!observationPath && !input.ctx.hasCases) {
    return { id: "cases", title: "Cases", mode: "hidden" };
  }

  if (input.ctx.hasCases) {
    return { id: "cases", title: "Cases", mode: "data" };
  }

  const guidanceByStage: Record<ProviderCommercialWorkflowStage, string> = {
    early_discovery:
      "Case tracking opens once observation or product-support field time is on the calendar.",
    observation:
      "Cases log observation days and in-room support. Schedule field time first — they will appear here automatically.",
    evaluation:
      "Link evaluation and trial cases to measure whether procedural adoption is sticking.",
    adoption:
      "Supported cases accumulate here as repeat use and preference-card work progresses.",
  };

  return {
    id: "cases",
    title: "Cases",
    mode: "guidance",
    guidance: guidanceByStage[input.commercialStage],
    actionHref: observationPath ? input.newCaseHref : undefined,
    actionLabel: observationPath ? "Add case" : undefined,
  };
}

function initiativesStream(input: {
  commercialStage: ProviderCommercialWorkflowStage;
  ctx: ProviderOverviewVisibilityContext;
  evalActivity: boolean;
  createOpportunityHref: string;
}): ProviderOverviewWorkStream {
  if (input.ctx.hasOpportunities) {
    return { id: "initiatives", title: "Opportunities", mode: "data" };
  }

  if (!input.evalActivity) {
    return { id: "initiatives", title: "Opportunities", mode: "hidden" };
  }

  const guidance =
    input.commercialStage === "adoption"
      ? "Formalize preference-card progress or expansion goals as opportunities when you are ready to run the adoption workflow."
      : input.commercialStage === "evaluation"
        ? "Track evaluation planned, active trials, and outcome review on an evaluation once conversion intent is confirmed."
        : "Opportunities become available after evaluation activity begins.";

  return {
    id: "initiatives",
    title: "Opportunities",
    mode: "guidance",
    guidance,
    actionHref: input.createOpportunityHref,
    actionLabel: OPPORTUNITY_UI.addToOpportunities,
  };
}

function evaluationTrackingStream(input: {
  commercialStage: ProviderCommercialWorkflowStage;
  ctx: ProviderOverviewVisibilityContext;
  hasEvalOpportunities: boolean;
}): ProviderOverviewWorkStream {
  if (input.commercialStage !== "observation") {
    return { id: "evaluation_tracking", title: "Evaluation tracking", mode: "hidden" };
  }

  if (input.hasEvalOpportunities || input.ctx.hasOpportunities) {
    return { id: "evaluation_tracking", title: "Evaluation tracking", mode: "hidden" };
  }

  return {
    id: "evaluation_tracking",
    title: "Evaluation tracking",
    mode: "guidance",
    guidance:
      "Product evaluation workflows unlock after clinical validation — focus on observation and workflow intelligence first.",
  };
}

function adoptionWorkflowStream(input: {
  commercialStage: ProviderCommercialWorkflowStage;
  ctx: ProviderOverviewVisibilityContext;
  adoptionMaturity: boolean;
  hasAdoptionOpportunities: boolean;
}): ProviderOverviewWorkStream {
  if (!input.adoptionMaturity) {
    return { id: "adoption_workflow", title: "Adoption workflow", mode: "hidden" };
  }

  if (input.hasAdoptionOpportunities) {
    return { id: "adoption_workflow", title: "Adoption workflow", mode: "hidden" };
  }

  return {
    id: "adoption_workflow",
    title: "Adoption workflow",
    mode: "guidance",
    guidance:
      "Preference-card progress and expansion stages appear on opportunities as trials convert to repeat use — advance the opportunity when cases support adoption.",
  };
}

export function buildProviderOverviewWorkDisclosure(input: {
  commercialStage: ProviderCommercialWorkflowStage;
  relationshipStage: string;
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  newCaseHref: string;
  createOpportunityHref: string;
}): ProviderOverviewWorkStream[] {
  const ctx = buildProviderOverviewVisibilityContext({
    cases: input.cases,
    opportunities: input.opportunities,
    engagements: input.engagements,
  });

  const opportunities = input.opportunities ?? [];
  const completedEngagements = countCompletedEngagements(input.engagements ?? []);
  const evalActivity = hasEvaluationActivity({
    commercialStage: input.commercialStage,
    opportunities,
    completedEngagements,
  });
  const adoptionMaturity = hasAdoptionWorkflowMaturity({
    commercialStage: input.commercialStage,
    opportunities,
  });
  const hasObservationCase = (input.cases ?? []).some(
    (c) => String(c.case_type || "").toLowerCase() === "observation",
  );
  const hasEvalOpportunities = opportunitiesInStages(opportunities, EVALUATION_OPPORTUNITY_STAGES);
  const hasAdoptionOpportunities = opportunitiesInStages(opportunities, ADOPTION_OPPORTUNITY_STAGES);

  const streams = [
    casesStream({
      commercialStage: input.commercialStage,
      ctx,
      relationshipStage: input.relationshipStage,
      hasObservationCase,
      newCaseHref: input.newCaseHref,
    }),
    initiativesStream({
      commercialStage: input.commercialStage,
      ctx,
      evalActivity,
      createOpportunityHref: input.createOpportunityHref,
    }),
    evaluationTrackingStream({
      commercialStage: input.commercialStage,
      ctx,
      hasEvalOpportunities,
    }),
    adoptionWorkflowStream({
      commercialStage: input.commercialStage,
      ctx,
      adoptionMaturity,
      hasAdoptionOpportunities,
    }),
  ];

  return streams.filter((s) => s.mode !== "hidden");
}

export function providerOverviewWorkDisclosureHasData(streams: ProviderOverviewWorkStream[]): boolean {
  return streams.some((s) => s.mode === "data");
}

export function providerOverviewWorkDisclosureSummary(
  streams: ProviderOverviewWorkStream[],
): string | null {
  const labels: string[] = [];
  for (const s of streams) {
    if (s.mode === "data") {
      if (s.id === "cases") labels.push("cases");
      if (s.id === "initiatives") labels.push("opportunities");
    }
  }
  if (labels.length === 0) return null;
  return `Includes ${labels.join(", ")}`;
}

/** @deprecated Use buildProviderOverviewWorkDisclosure for overview narrative. */
export function providerOverviewWorkPreviewModeFromDisclosure(
  streams: ProviderOverviewWorkStream[],
): { showCases: boolean; showOpportunities: boolean } {
  const cases = streams.find((s) => s.id === "cases");
  const initiatives = streams.find((s) => s.id === "initiatives");
  return {
    showCases: cases?.mode === "data",
    showOpportunities: initiatives?.mode === "data",
  };
}
