/**
 * Canonical rep-facing sales terminology (V1).
 *
 * Provider — person/relationship record.
 * Opportunity — provider-level commercial prospect worth pursuing.
 * Product Fit — specific product/category that may solve a pain or workflow need.
 * Evaluation — product trial, demo, in-service, or first supported case.
 * Adoption — repeat use or meaningful product conversion.
 *
 * Rule: do not use "Opportunity" for a specific product unless the phrase is
 * "Product Opportunity" or "Product Fit".
 */

export const SALES_TERMINOLOGY = {
  /** Nav / page */
  opportunitiesNav: "Opportunities",
  opportunitiesPageLead:
    "Providers worth pursuing — not every provider is an opportunity. Product fits emerge from discovery, observation, and debrief.",

  /** Provider pipeline actions */
  markAsProspect: "Mark as Prospect",
  addToOpportunities: "Add to Opportunities",
  providerAddedToOpportunities: "Provider added to Opportunities",

  /** Links */
  relatedOpportunity: "Related opportunity",
  relatedOpportunityOptional: "Related opportunity (optional)",
  noRelatedOpportunity: "No related opportunity",
  relatedOpportunityLinked: "Related opportunity linked",
  relatedOpportunityFiles: "Related opportunity files",

  /** Product fit surfaces */
  productFitSignals: "Product Fit Signals",
  productFitHypotheses: "Product Fit Hypotheses",
  productFit: "Product Fit",
  productOpportunity: "Product Opportunity",

  /** Evaluation records (legacy sales_opportunities) */
  evaluation: "Evaluation",
  evaluationSingular: "evaluation",
  evaluationPlural: "evaluations",
  relatedEvaluation: "Related evaluation",
  relatedEvaluationOptional: "Related evaluation (optional)",
  noRelatedEvaluation: "No related evaluation",
  startEvaluation: "Start evaluation",
  advanceEvaluation: "Advance evaluation",
  evaluationStage: "Evaluation stage",

  /** Adoption */
  adoption: "Adoption",

  /** Mission / pipeline */
  prospectPipeline: "Prospect pipeline",
  onOpportunitiesPipeline: "On Opportunities pipeline",
  prospectActive: "Prospect active",

  /** Activity badges */
  opportunityActivity: "Opportunity activity",
  opportunityAdvanced: "Opportunity advanced",
  evaluationStarted: "Evaluation started",
  evaluationAdvanced: "Evaluation advanced",
} as const;
