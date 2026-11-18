/** Discovery mapping signal ids — isolated to avoid circular imports with opportunity intelligence. */

export type DiscoveryStructuredSignalId =
  | "observation_approval"
  | "scheduling_owner"
  | "facility_vendor_pathway"
  | "observation_logistics"
  | "workflow_visibility"
  | "product_alignment"
  | "case_opportunity"
  | "clinical_champion"
  | "decision_influence"
  | "opportunity_clinical_frustrations"
  | "opportunity_workflow_inefficiencies"
  | "opportunity_products_in_use"
  | "opportunity_product_gaps"
  | "opportunity_outcome_priorities"
  | "opportunity_staff_frustrations"
  | "opportunity_future_signals";
