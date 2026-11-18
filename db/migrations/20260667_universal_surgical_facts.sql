-- Universal Surgical Intelligence Extractor — canonical facts stored separately from
-- legacy provider/case/debrief intelligence. Additive only; no replacement of existing SOR.

CREATE TABLE IF NOT EXISTS public.universal_surgical_fact_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_note text NOT NULL,
  declared_source_type text NOT NULL,
  extraction_model text NOT NULL,
  extraction_ms integer NULL,
  provider_id uuid NULL REFERENCES public.surgical_sales_contacts (id) ON DELETE SET NULL,
  organization_id uuid NULL REFERENCES public.sales_organizations (id) ON DELETE SET NULL,
  case_id uuid NULL REFERENCES public.surgical_sales_cases (id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES public.surgical_sales_engagements (id) ON DELETE SET NULL,
  operational_note_id uuid NULL REFERENCES public.sales_operational_notes (id) ON DELETE SET NULL,
  workflow_stage text NULL,
  product_context text NULL,
  legacy_extraction_summary jsonb NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT universal_surgical_fact_captures_source_check CHECK (
    declared_source_type IN (
      'intro_call',
      'office_visit',
      'discovery_note',
      'observation_case',
      'debrief_note',
      'debrief_validation',
      'product_support_case',
      'evaluation_note',
      'outcome_note'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.universal_surgical_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id uuid NOT NULL REFERENCES public.universal_surgical_fact_captures (id) ON DELETE CASCADE,
  provider_id uuid NULL REFERENCES public.surgical_sales_contacts (id) ON DELETE SET NULL,
  organization_id uuid NULL REFERENCES public.sales_organizations (id) ON DELETE SET NULL,
  case_id uuid NULL REFERENCES public.surgical_sales_cases (id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES public.surgical_sales_engagements (id) ON DELETE SET NULL,
  concept text NOT NULL,
  normalized_label text NOT NULL,
  assertion_level text NOT NULL,
  source_type text NOT NULL,
  evidence_text text NOT NULL,
  confidence text NOT NULL,
  negated boolean NOT NULL DEFAULT false,
  uncertain boolean NOT NULL DEFAULT false,
  suppressed boolean NOT NULL DEFAULT false,
  product_mentioned text NULL,
  person_mentioned text NULL,
  item_mentioned text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT universal_surgical_facts_concept_check CHECK (
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
      'unknown'
    )
  ),
  CONSTRAINT universal_surgical_facts_assertion_check CHECK (
    assertion_level IN (
      'provider_reported',
      'observed',
      'case_supported',
      'validated',
      'rejected',
      'evaluated',
      'outcome_reported'
    )
  ),
  CONSTRAINT universal_surgical_facts_confidence_check CHECK (
    confidence IN ('high', 'medium', 'low')
  )
);

CREATE INDEX IF NOT EXISTS idx_universal_surgical_fact_captures_provider
  ON public.universal_surgical_fact_captures (provider_id, created_at DESC)
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_universal_surgical_fact_captures_organization
  ON public.universal_surgical_fact_captures (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_universal_surgical_fact_captures_case
  ON public.universal_surgical_fact_captures (case_id, created_at DESC)
  WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_universal_surgical_fact_captures_encounter
  ON public.universal_surgical_fact_captures (encounter_id, created_at DESC)
  WHERE encounter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_universal_surgical_fact_captures_note
  ON public.universal_surgical_fact_captures (operational_note_id)
  WHERE operational_note_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_universal_surgical_facts_provider
  ON public.universal_surgical_facts (provider_id, created_at DESC)
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_universal_surgical_facts_organization
  ON public.universal_surgical_facts (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_universal_surgical_facts_case
  ON public.universal_surgical_facts (case_id, created_at DESC)
  WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_universal_surgical_facts_encounter
  ON public.universal_surgical_facts (encounter_id, created_at DESC)
  WHERE encounter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_universal_surgical_facts_concept
  ON public.universal_surgical_facts (concept, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_universal_surgical_facts_capture
  ON public.universal_surgical_facts (capture_id);

COMMENT ON TABLE public.universal_surgical_fact_captures IS
  'One row per universal extractor run. Scope IDs denormalized onto child facts for screen queries.';

COMMENT ON TABLE public.universal_surgical_facts IS
  'Canonical surgical facts for shared consumption across provider, case, debrief, evaluation, and outcome screens.';

ALTER TABLE public.universal_surgical_fact_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universal_surgical_facts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.universal_surgical_fact_captures TO authenticated;
GRANT SELECT, INSERT ON public.universal_surgical_facts TO authenticated;
GRANT ALL ON public.universal_surgical_fact_captures TO service_role;
GRANT ALL ON public.universal_surgical_facts TO service_role;

DROP POLICY IF EXISTS universal_surgical_fact_captures_select ON public.universal_surgical_fact_captures;
CREATE POLICY universal_surgical_fact_captures_select ON public.universal_surgical_fact_captures
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS universal_surgical_fact_captures_insert ON public.universal_surgical_fact_captures;
CREATE POLICY universal_surgical_fact_captures_insert ON public.universal_surgical_fact_captures
  FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS universal_surgical_fact_captures_service ON public.universal_surgical_fact_captures;
CREATE POLICY universal_surgical_fact_captures_service ON public.universal_surgical_fact_captures
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS universal_surgical_facts_select ON public.universal_surgical_facts;
CREATE POLICY universal_surgical_facts_select ON public.universal_surgical_facts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS universal_surgical_facts_insert ON public.universal_surgical_facts;
CREATE POLICY universal_surgical_facts_insert ON public.universal_surgical_facts
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS universal_surgical_facts_service ON public.universal_surgical_facts;
CREATE POLICY universal_surgical_facts_service ON public.universal_surgical_facts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
