/**
 * Derives the 12-category Universal Intelligence taxonomy from a persisted UF fact.
 * Used across review projection, Provider Intelligence chips, and card routing —
 * without specialty, product, or provider-specific logic.
 */

import type { UniversalCanonicalConcept } from "@/lib/surgical-sales/universalExtractor/types";
import {
  categoryForConcept,
  type UniversalIntelligenceCategory,
} from "@/lib/surgical-sales/universalExtractor/universalIntelligenceCategories";

function factText(input: {
  normalized_label?: string | null;
  evidence_text?: string | null;
}): string {
  return `${input.normalized_label ?? ""} ${input.evidence_text ?? ""}`.trim();
}

function isRelationshipSignal(text: string): boolean {
  return (
    /^relationship:/i.test(text) ||
    /\brelationship signal\b/i.test(text) ||
    /\bopen to continuing\b/i.test(text) ||
    /\bcontinue the (?:relationship|conversation)\b/i.test(text) ||
    /\binterested in continuing discussions\b/i.test(text) ||
    /\bcontinuing discussions\b/i.test(text)
  );
}

function isCommercialDisposition(text: string): boolean {
  return (
    /^commercial disposition:/i.test(text) ||
    /\bcommercial disposition\b/i.test(text) ||
    /\bobserv(?:e|ing)\s+a case\b.{0,80}\bbefore\b/i.test(text) ||
    /\bbest next step before\b/i.test(text) ||
    /\bno formal (?:product )?evaluation\b/i.test(text) ||
    /\bevaluation sequencing\b/i.test(text) ||
    /\bobserve before eval/i.test(text)
  );
}

function isWorkflowPriority(text: string): boolean {
  return (
    /^workflow priority:/i.test(text) ||
    /\bworkflow priority\b/i.test(text) ||
    /\bimportant priorities?\b/i.test(text) ||
    /\bpriorit(?:y|ies)\b/i.test(text) ||
    /\bturnover time importance\b/i.test(text) ||
    /\bstaff satisfaction importance\b/i.test(text) ||
    /\bworkflow efficiency priority\b/i.test(text)
  );
}

export function resolveIntelligenceCategoryForFact(input: {
  concept: UniversalCanonicalConcept | string;
  normalized_label?: string | null;
  evidence_text?: string | null;
}): UniversalIntelligenceCategory | null {
  const concept = String(input.concept);
  const text = factText(input);

  if (concept === "provider_sentiment") {
    // Label prefixes win first so "Commercial disposition: … open to observe"
    // is not misclassified as relationship from a later "open to" clause.
    if (isCommercialDisposition(text)) return "commercial_disposition";
    if (isRelationshipSignal(text)) return "relationship_signal";
    if (/\bevaluation|observe before|formal eval|not actively looking/i.test(text)) {
      return "commercial_disposition";
    }
    if (
      /\b(?:open to continuing|continue the (?:relationship|conversation)|interested in continuing)\b/i.test(
        text,
      ) ||
      /^relationship:/i.test(text)
    ) {
      return "relationship_signal";
    }
    if (/\brelationship|continuing|receptive\b/i.test(text) && !/\bopen to (?:having|observe|observation)\b/i.test(text)) {
      return "relationship_signal";
    }
    return "commercial_disposition";
  }

  if (concept === "workflow_or_timing_issue") {
    return isWorkflowPriority(text) ? "workflow_priority" : "workflow_friction";
  }

  if (concept === "staff_workflow") {
    return "workflow_friction";
  }

  if (concept === "procedure_volume_trend" || concept === "technology_preference") {
    return "clinical_trend";
  }

  if (concept === "procedure_focus") {
    return "procedure_trend";
  }

  return categoryForConcept(concept as UniversalCanonicalConcept);
}

export function resolveSentimentReviewDbKey(input: {
  normalized_label?: string | null;
  evidence_text?: string | null;
}): "provider_communication_style" | "provider_future_opportunity_signals" | "provider_evaluation_openness" {
  const category = resolveIntelligenceCategoryForFact({
    concept: "provider_sentiment",
    ...input,
  });
  if (category === "relationship_signal") return "provider_communication_style";
  if (category === "commercial_disposition") {
    const text = factText(input);
    if (/\bevaluation|observe before|formal eval|sequenc/i.test(text)) {
      return "provider_evaluation_openness";
    }
    return "provider_future_opportunity_signals";
  }
  return "provider_future_opportunity_signals";
}
