-- Expand universal_surgical_facts concept CHECK for GPT extractor + category migration.

ALTER TABLE public.universal_surgical_facts
  DROP CONSTRAINT IF EXISTS universal_surgical_facts_concept_check;

ALTER TABLE public.universal_surgical_facts
  ADD CONSTRAINT universal_surgical_facts_concept_check CHECK (
    concept IN (
      'current_product',
      'competitor_product',
      'inventory_availability_issue',
      'requested_item',
      'unavailable_item',
      'alternative_used',
      'sizing_or_fit_issue',
      'placement_or_positioning_issue',
      'visualization_or_access_issue',
      'training_or_familiarity_issue',
      'workflow_or_timing_issue',
      'product_performance_issue',
      'provider_sentiment',
      'staff_workflow',
      'case_outcome',
      'support_needed',
      'next_action',
      'no_issue_or_routine',
      'procedure_volume_trend',
      'procedure_focus',
      'technology_preference',
      'contact_role',
      'access_pathway',
      'credentialing_requirement',
      'unknown'
    )
  );
