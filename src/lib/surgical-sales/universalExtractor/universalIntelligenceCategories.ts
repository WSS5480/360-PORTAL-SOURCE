/**
 * Universal intelligence categories — specialty-agnostic taxonomy for UF extraction,
 * review projection, and Provider Intelligence read surfaces.
 */

import type { UniversalCanonicalConcept } from "@/lib/surgical-sales/universalExtractor/types";

export const UNIVERSAL_INTELLIGENCE_CATEGORIES = [
  "clinical_trend",
  "procedure_trend",
  "workflow_friction",
  "workflow_priority",
  "commercial_disposition",
  "access_pathway",
  "relationship_signal",
  "product_interest",
  "product_usage",
  "product_dissatisfaction",
  "operational_constraint",
  "contact_role",
  "next_step_recommendation",
] as const;

export type UniversalIntelligenceCategory = (typeof UNIVERSAL_INTELLIGENCE_CATEGORIES)[number];

export type CategoryPipelineStage = "extract" | "persist" | "review" | "provider_intelligence";

export type UniversalIntelligenceCategoryDef = {
  id: UniversalIntelligenceCategory;
  label: string;
  ufConcepts: UniversalCanonicalConcept[];
  /** Primary UF concepts the rules engine should emit for this category. */
  primaryConcepts: UniversalCanonicalConcept[];
  extractToday: boolean;
  persistToday: boolean;
  reviewProjectionToday: boolean;
  providerIntelligenceToday: boolean;
  notes: string;
};

export const UNIVERSAL_INTELLIGENCE_CATEGORY_DEFS: UniversalIntelligenceCategoryDef[] = [
  {
    id: "clinical_trend",
    label: "Clinical trend",
    ufConcepts: ["procedure_volume_trend", "technology_preference"],
    primaryConcepts: ["procedure_volume_trend", "technology_preference"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Generic volume/modality language — not catalog-bound procedure names.",
  },
  {
    id: "procedure_trend",
    label: "Procedure trend",
    ufConcepts: ["procedure_volume_trend", "procedure_focus"],
    primaryConcepts: ["procedure_volume_trend", "procedure_focus"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Procedure emphasis or increasing volume for any procedure noun phrase.",
  },
  {
    id: "workflow_friction",
    label: "Workflow friction",
    ufConcepts: [
      "workflow_or_timing_issue",
      "visualization_or_access_issue",
      "placement_or_positioning_issue",
      "sizing_or_fit_issue",
      "inventory_availability_issue",
      "product_performance_issue",
      "staff_workflow",
    ],
    primaryConcepts: [
      "workflow_or_timing_issue",
      "visualization_or_access_issue",
      "product_performance_issue",
      "inventory_availability_issue",
      "staff_workflow",
    ],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "OR efficiency, turnover delays, instrumentation frustration, visualization pain.",
  },
  {
    id: "workflow_priority",
    label: "Workflow priority",
    ufConcepts: ["workflow_or_timing_issue"],
    primaryConcepts: ["workflow_or_timing_issue"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Rep-ranked workflow priorities (efficiency, consistency, turnover, staff satisfaction).",
  },
  {
    id: "commercial_disposition",
    label: "Commercial disposition",
    ufConcepts: ["provider_sentiment"],
    primaryConcepts: ["provider_sentiment"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Evaluation posture — observe before eval, no formal evaluation, continued discussion.",
  },
  {
    id: "access_pathway",
    label: "Access pathway",
    ufConcepts: ["access_pathway"],
    primaryConcepts: ["access_pathway"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Observation interest/receptivity and access timing — not CRM approval state.",
  },
  {
    id: "relationship_signal",
    label: "Relationship signal",
    ufConcepts: ["provider_sentiment"],
    primaryConcepts: ["provider_sentiment"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Open to continue, receptive tone, interested in ongoing discussions.",
  },
  {
    id: "product_interest",
    label: "Product interest",
    ufConcepts: ["product_interest"],
    primaryConcepts: ["product_interest"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Provider buying signal short of evaluation — comparison questions, data requests, stated product interest.",
  },
  {
    id: "product_usage",
    label: "Product usage",
    ufConcepts: ["current_product", "competitor_product"],
    primaryConcepts: ["current_product", "competitor_product"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Shared product mention extractor — catalog-assisted, not specialty-bound.",
  },
  {
    id: "product_dissatisfaction",
    label: "Product dissatisfaction",
    ufConcepts: ["product_performance_issue", "sizing_or_fit_issue"],
    primaryConcepts: ["product_performance_issue"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Performance frustration, fit/sizing issues tied to product context.",
  },
  {
    id: "operational_constraint",
    label: "Operational constraint",
    ufConcepts: ["inventory_availability_issue", "requested_item", "unavailable_item", "alternative_used"],
    primaryConcepts: ["inventory_availability_issue", "unavailable_item", "requested_item"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Inventory, unavailable items, requested trays — observation + product support paths.",
  },
  {
    id: "contact_role",
    label: "Contact role",
    ufConcepts: ["contact_role"],
    primaryConcepts: ["contact_role"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Named role holders (scheduler/coordinator). UF evidence only — CRM contact write stays DWP.",
  },
  {
    id: "next_step_recommendation",
    label: "Next-step recommendation",
    ufConcepts: ["next_action"],
    primaryConcepts: ["next_action"],
    extractToday: true,
    persistToday: true,
    reviewProjectionToday: true,
    providerIntelligenceToday: true,
    notes: "Rep-stated next steps and follow-up actions.",
  },
];

export function categoryForConcept(concept: UniversalCanonicalConcept): UniversalIntelligenceCategory | null {
  for (const def of UNIVERSAL_INTELLIGENCE_CATEGORY_DEFS) {
    if (def.primaryConcepts.includes(concept)) return def.id;
  }
  return null;
}

export function categoriesForConcept(concept: UniversalCanonicalConcept): UniversalIntelligenceCategory[] {
  return UNIVERSAL_INTELLIGENCE_CATEGORY_DEFS.filter((def) =>
    def.primaryConcepts.includes(concept),
  ).map((def) => def.id);
}

export function conceptsForCategory(category: UniversalIntelligenceCategory): UniversalCanonicalConcept[] {
  return UNIVERSAL_INTELLIGENCE_CATEGORY_DEFS.find((def) => def.id === category)?.primaryConcepts ?? [];
}
