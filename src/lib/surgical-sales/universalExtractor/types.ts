import { z } from "zod";

/** Declared capture source — set by caller, never inferred from text. */
export const UNIVERSAL_DECLARED_SOURCE_TYPES = [
  "intro_call",
  "office_visit",
  "discovery_note",
  "observation_case",
  "debrief_note",
  "debrief_validation",
  "product_support_case",
  "evaluation_note",
  "outcome_note",
] as const;

export type UniversalDeclaredSourceType = (typeof UNIVERSAL_DECLARED_SOURCE_TYPES)[number];

export const UNIVERSAL_CANONICAL_CONCEPTS = [
  "current_product",
  "competitor_product",
  "inventory_availability_issue",
  "requested_item",
  "unavailable_item",
  "alternative_used",
  "sizing_or_fit_issue",
  "placement_or_positioning_issue",
  "visualization_or_access_issue",
  "training_or_familiarity_issue",
  "workflow_or_timing_issue",
  "product_performance_issue",
  "provider_sentiment",
  "product_interest",
  "staff_workflow",
  "case_outcome",
  "support_needed",
  "next_action",
  "no_issue_or_routine",
  "procedure_volume_trend",
  "procedure_focus",
  "technology_preference",
  "contact_role",
  "access_pathway",
  "credentialing_requirement",
  "unknown",
] as const;

export type UniversalCanonicalConcept = (typeof UNIVERSAL_CANONICAL_CONCEPTS)[number];

export const UNIVERSAL_ASSERTION_LEVELS = [
  "provider_reported",
  "observed",
  "case_supported",
  "validated",
  "rejected",
  "evaluated",
  "outcome_reported",
] as const;

export type UniversalAssertionLevel = (typeof UNIVERSAL_ASSERTION_LEVELS)[number];

export const UNIVERSAL_CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type UniversalConfidenceLevel = (typeof UNIVERSAL_CONFIDENCE_LEVELS)[number];

export type UniversalExtractorContext = {
  provider_id?: string;
  organization_id?: string;
  case_id?: string;
  encounter_id?: string;
  product_context?: string;
  workflow_stage?: string;
  provider_display_name?: string;
};

export type UniversalExtractorInput = {
  raw_note: string;
  declared_source_type: UniversalDeclaredSourceType;
  context?: UniversalExtractorContext;
};

export type UniversalSurgicalFact = {
  concept: UniversalCanonicalConcept;
  normalized_label: string;
  assertion_level: UniversalAssertionLevel;
  source_type: UniversalDeclaredSourceType;
  evidence_text: string;
  confidence: UniversalConfidenceLevel;
  negated: boolean;
  uncertain: boolean;
  product_mentioned?: string;
  person_mentioned?: string;
  item_mentioned?: string;
  notes?: string;
};

export type UniversalExtractionModel = "universal-surgical-rules-v1" | "universal-surgical-gpt-v1";

export type UniversalExtractionResult = {
  model: UniversalExtractionModel;
  extracted_at: string;
  extraction_ms: number;
  declared_source_type: UniversalDeclaredSourceType;
  raw_note: string;
  facts: UniversalSurgicalFact[];
  suppressed_facts: UniversalSurgicalFact[];
  shadow_mode: true;
  /** Present when GPT extraction ran — telemetry only. */
  extraction_engine?: "gpt" | "rules";
  gpt_rejection_count?: number;
};

export const UniversalExtractorInputSchema = z.object({
  raw_note: z.string().min(1).max(8000),
  declared_source_type: z.enum(UNIVERSAL_DECLARED_SOURCE_TYPES),
  context: z
    .object({
      provider_id: z.string().uuid().optional(),
      organization_id: z.string().uuid().optional(),
      case_id: z.string().uuid().optional(),
      encounter_id: z.string().uuid().optional(),
      product_context: z.string().max(500).optional(),
      workflow_stage: z.string().max(64).optional(),
      provider_display_name: z.string().max(200).optional(),
    })
    .optional(),
});
