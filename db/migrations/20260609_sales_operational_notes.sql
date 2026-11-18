-- Structured operational notes (simple body-only writes remain valid).

CREATE TABLE IF NOT EXISTS public.sales_operational_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  related_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  note_type text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}',
  workflow_stage text NULL,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  provider_id uuid NULL,
  organization_id uuid NULL,
  case_id uuid NULL,
  opportunity_id uuid NULL,
  task_ids uuid[] NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'manual',
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  legacy_case_activity_id uuid NULL,
  legacy_provider_activity_id uuid NULL,
  CONSTRAINT sales_operational_notes_entity_type_check CHECK (
    entity_type IN ('case', 'provider', 'opportunity', 'organization')
  ),
  CONSTRAINT sales_operational_notes_source_check CHECK (
    source IN ('manual', 'ai', 'imported')
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_operational_notes_entity
  ON public.sales_operational_notes (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_operational_notes_case
  ON public.sales_operational_notes (case_id, created_at DESC)
  WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_operational_notes_provider
  ON public.sales_operational_notes (provider_id, created_at DESC)
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_operational_notes_created_at
  ON public.sales_operational_notes (created_at DESC);

COMMENT ON TABLE public.sales_operational_notes IS
  'Structured CRM notes with optional classification; dual-written to activity timelines as NOTE_ADDED.';

ALTER TABLE public.sales_operational_notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.sales_operational_notes TO authenticated;
GRANT ALL ON public.sales_operational_notes TO service_role;

DROP POLICY IF EXISTS sales_operational_notes_select ON public.sales_operational_notes;
CREATE POLICY sales_operational_notes_select ON public.sales_operational_notes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS sales_operational_notes_insert ON public.sales_operational_notes;
CREATE POLICY sales_operational_notes_insert ON public.sales_operational_notes
  FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS sales_operational_notes_service ON public.sales_operational_notes;
CREATE POLICY sales_operational_notes_service ON public.sales_operational_notes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
