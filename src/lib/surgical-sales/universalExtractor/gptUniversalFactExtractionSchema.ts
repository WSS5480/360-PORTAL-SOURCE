/**
 * OpenAI structured output schema for Universal Facts extraction.
 * GPT emits extraction categories; server maps to canonical UF concepts.
 */

import { z } from "zod";
import type { UniversalCanonicalConcept } from "@/lib/surgical-sales/universalExtractor/types";

/** Categories the model extracts — mapped deterministically to UF concepts. */
export const GPT_UNIVERSAL_EXTRACTION_CATEGORIES = [
  "procedure_trend",
  "clinical_growth_signal",
  "procedure_focus",
  "technology_modality",
  "product_usage",
  "competitor_usage",
  "workflow_friction",
  "operational_priority",
  "operational_concern",
  "visualization_issue",
  "inventory_issue",
  "sizing_or_fit_issue",
  "staff_workflow",
  "staff_influence",
  "scheduler_contact",
  "credentialing",
  "access_pathway",
  "commercial_disposition",
  "evaluation_sequencing",
  "relationship_signal",
  "product_interest",
  "next_action",
] as const;

export type GptUniversalExtractionCategory = (typeof GPT_UNIVERSAL_EXTRACTION_CATEGORIES)[number];

export const GptUniversalFactRowSchema = z.object({
  category: z.enum(GPT_UNIVERSAL_EXTRACTION_CATEGORIES),
  normalized_label: z.string().min(4).max(240),
  evidence_text: z.string().min(8).max(2000),
  confidence: z.enum(["high", "medium", "low"]),
  subject_provider: z.string().max(120).optional().nullable(),
  product_name: z.string().max(120).optional().nullable(),
  procedure_name: z.string().max(120).optional().nullable(),
  person_name: z.string().max(120).optional().nullable(),
  role: z.string().max(120).optional().nullable(),
  should_persist: z.boolean(),
  rejection_reason: z.string().max(400).optional().nullable(),
});

export type GptUniversalFactRow = z.infer<typeof GptUniversalFactRowSchema>;

export const GptUniversalFactExtractionResultSchema = z.object({
  facts: z.array(GptUniversalFactRowSchema).max(64),
});

export type GptUniversalFactExtractionResult = z.infer<typeof GptUniversalFactExtractionResultSchema>;

const CATEGORY_TO_CONCEPT: Record<GptUniversalExtractionCategory, UniversalCanonicalConcept> = {
  procedure_trend: "procedure_focus",
  clinical_growth_signal: "procedure_volume_trend",
  procedure_focus: "procedure_focus",
  technology_modality: "technology_preference",
  product_usage: "current_product",
  competitor_usage: "competitor_product",
  workflow_friction: "workflow_or_timing_issue",
  operational_priority: "workflow_or_timing_issue",
  operational_concern: "workflow_or_timing_issue",
  visualization_issue: "visualization_or_access_issue",
  inventory_issue: "inventory_availability_issue",
  sizing_or_fit_issue: "sizing_or_fit_issue",
  staff_workflow: "staff_workflow",
  staff_influence: "staff_workflow",
  scheduler_contact: "contact_role",
  credentialing: "credentialing_requirement",
  access_pathway: "access_pathway",
  commercial_disposition: "provider_sentiment",
  evaluation_sequencing: "provider_sentiment",
  relationship_signal: "provider_sentiment",
  product_interest: "product_interest",
  next_action: "next_action",
};

export function mapGptCategoryToConcept(category: GptUniversalExtractionCategory): UniversalCanonicalConcept {
  return CATEGORY_TO_CONCEPT[category];
}

/** Refine concept for friction categories when product performance is explicit. */
export function resolveConceptForGptRow(row: GptUniversalFactRow): UniversalCanonicalConcept {
  const blob = `${row.normalized_label} ${row.evidence_text}`;

  if (row.category === "inventory_issue") {
    if (/\b(?:unavailable|not available|out of stock|requested)\b/i.test(row.evidence_text)) {
      if (/\brequested\b/i.test(row.evidence_text)) return "requested_item";
      if (/\bunavailable|not available|out of stock\b/i.test(row.evidence_text)) {
        return "unavailable_item";
      }
    }
    return "inventory_availability_issue";
  }

  if (row.category === "workflow_friction") {
    if (/\b(?:availability|available|unavailable|stock|stocked|instrumentation availability)\b/i.test(blob)) {
      return "inventory_availability_issue";
    }
    if (
      /\b(?:product|implant|device)\b/i.test(blob) &&
      /\b(?:frustrat|perform|dissatisf|issue|concern)\b/i.test(blob) &&
      !/\b(?:availability|available|unavailable)\b/i.test(blob)
    ) {
      return "product_performance_issue";
    }
    return "workflow_or_timing_issue";
  }

  if (row.category === "operational_concern") {
    if (/\b(?:staff|nurse|resident|scrub|circulat|surgical team|or team)\b/i.test(blob)) {
      return "staff_workflow";
    }
    return "workflow_or_timing_issue";
  }

  return mapGptCategoryToConcept(row.category);
}
