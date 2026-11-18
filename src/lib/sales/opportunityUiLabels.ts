/**
 * User-facing copy for Opportunities (provider prospects) and related surfaces.
 * Internal routes / DB fields remain "opportunity".
 */

import { SALES_TERMINOLOGY as T } from "@/lib/sales/salesTerminology";

export const OPPORTUNITY_UI = {
  navListTitle: T.opportunitiesNav,

  listPageSubtitle: T.opportunitiesPageLead,
  emptyDescription:
    "No commercial prospects yet. Mark providers as Prospect to add them to Opportunities.",

  /** Provider profile — structured evaluation records when they exist */
  providerTabLabel: "Evaluations",
  providerTabEmpty: "No evaluations in progress.",
  opportunityStageLabel: T.evaluationStage,
  /** @deprecated Prefer opportunityStageLabel */
  initiativeStageLabel: T.evaluationStage,
  linkedFieldLabel: T.relatedEvaluation,
  linkedFieldLabelShort: T.evaluation,

  detailSubtitle: T.evaluation,
  detailTitle: "Evaluation details",

  createButton: T.startEvaluation,
  createButtonShort: T.startEvaluation,
  createModalTitle: "New evaluation",
  editModalTitle: "Edit evaluation",

  initiativeSingular: "prospect",
  initiativePlural: "prospects",
  opportunitySingular: "prospect",
  opportunityPlural: "prospects",
  openInitiativesLabel: "Pipeline prospects",
  openOpportunitiesLabel: "Pipeline prospects",

  emptyListCta: T.markAsProspect,

  createFromProvider: T.addToOpportunities,
  emptyLinked: "No evaluations linked.",
  browseAll: "View Opportunities →",
  fallbackRecordLabel: T.evaluation,

  newProspectHint:
    "Mark new providers as Prospect to include them on Opportunities. Product fits appear only after discovery, observation, or debrief.",

  dashboardCreateLabel: T.markAsProspect,
  dashboardViewLabel: "View Opportunities",
  pipelineDropHint: "Drag prospects as they advance through the pipeline.",
  pipelineTitle: T.prospectPipeline,
  pipelineFunnelTitle: T.prospectPipeline,
  boardLinkTable: "Pipeline view",
  boardLinkLabel: "Evaluation board",

  providerDirectoryFilterLabel: T.onOpportunitiesPipeline,
  providerActivityEmpty: "No case or field activity yet.",
  providerTimelineUpdate: "Product fit update",
  updateInitiativeStageAfterDebrief: "Update evaluation stage after debrief",
  updateOpportunityStageAfterDebrief: "Update evaluation stage after debrief",
  prepFollowUpExample: "e.g. Schedule observation · capture product fit signals",
  linkInitiativeCta: T.relatedEvaluation,
  linkOpportunityCta: T.relatedEvaluation,
  updateInitiativeStageCta: "Update evaluation stage",
  updateOpportunityStageCta: "Update evaluation stage",
  advanceOpportunityCta: T.advanceEvaluation,

  newCaseLinkedInitiativeOptional: T.relatedOpportunityOptional,
  newCaseNoLinkedInitiative: T.noRelatedOpportunity,
  newCaseShowingInitiativesForOrg: "Showing related opportunities for the selected organization.",
  newCaseIncludesInitiativesForProvider:
    "Includes related opportunities for this provider at the selected organization.",
  newCaseLockedInitiativeLabel: T.relatedOpportunity,
  newCaseLockedInitiativeHint:
    "Set from the related opportunity you opened. Change it from the provider profile, not here.",
  newCaseLoadingInitiative: "Loading related opportunity…",
  newCaseLockedOrgFromInitiative:
    "Set from the related opportunity you opened. Change it from the provider profile, not here.",
  newCaseProviderPanelIntro:
    "Start with the provider. Observations, debriefs, product fit signals, and next actions live on their profile.",

  /** Explicit rename targets */
  productFitSignals: T.productFitSignals,
  productFitHypotheses: T.productFitHypotheses,
  markAsProspect: T.markAsProspect,
  addToOpportunities: T.addToOpportunities,
  relatedOpportunity: T.relatedOpportunity,
  providerAddedToOpportunities: T.providerAddedToOpportunities,
} as const;

export function formatNewCaseLinkedInitiativesHeading(count: number): string {
  return `Related opportunities (${count})`;
}

export function formatNewCaseLinkedOpportunitiesHeading(count: number): string {
  return formatNewCaseLinkedInitiativesHeading(count);
}

export function formatProviderInitiativesTabTitle(count: number): string {
  return `${OPPORTUNITY_UI.providerTabLabel} (${count})`;
}

export function formatProviderOpportunitiesTabTitle(count: number): string {
  return formatProviderInitiativesTabTitle(count);
}

export function formatInitiativeStageLine(stageLabel: string): string {
  const stage = String(stageLabel ?? "").trim();
  if (!stage) return "";
  return `${OPPORTUNITY_UI.opportunityStageLabel}: ${stage}`;
}

export function formatOpportunityStageLine(stageLabel: string): string {
  return formatInitiativeStageLine(stageLabel);
}

export function formatOpportunityDetailSubtitle(meta?: string | null): string {
  const trimmed = String(meta ?? "").trim();
  return trimmed ? `${OPPORTUNITY_UI.detailSubtitle} · ${trimmed}` : OPPORTUNITY_UI.detailSubtitle;
}

export function adoptionInitiativeCountLabel(count: number): string {
  return `${count} ${count === 1 ? OPPORTUNITY_UI.opportunitySingular : OPPORTUNITY_UI.opportunityPlural}`;
}

export function opportunityCountLabel(count: number): string {
  return adoptionInitiativeCountLabel(count);
}

/** Detect legacy initiative terminology that should not appear in rep-facing UI. */
export function containsInitiativeWording(text: string): boolean {
  return /\binitiative(?:s)?\b/i.test(text);
}

/** Rep-facing label for sales_opportunities rows (evaluations, not provider prospects). */
export function formatEvaluationRecordLabel(name?: string | null): string {
  const trimmed = String(name ?? "").trim();
  return trimmed || OPPORTUNITY_UI.fallbackRecordLabel;
}
