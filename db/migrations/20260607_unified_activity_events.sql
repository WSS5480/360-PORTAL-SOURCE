-- Unified activity event log (dual-write alongside legacy activity tables).

CREATE TABLE IF NOT EXISTS public.unified_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  related_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  workflow_stage text NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  ai_generated boolean NOT NULL DEFAULT false,
  source text NOT NULL,
  legacy_source text NULL,
  legacy_activity_id uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_unified_activity_events_entity
  ON public.unified_activity_events (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_unified_activity_events_created_at
  ON public.unified_activity_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_unified_activity_events_type
  ON public.unified_activity_events (type, created_at DESC);

COMMENT ON TABLE public.unified_activity_events IS
  'Canonical activity timeline; dual-written with legacy case/provider/opportunity activity tables during migration.';

ALTER TABLE public.unified_activity_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.unified_activity_events TO authenticated;
GRANT ALL ON public.unified_activity_events TO service_role;

DROP POLICY IF EXISTS unified_activity_events_select ON public.unified_activity_events;
CREATE POLICY unified_activity_events_select ON public.unified_activity_events
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS unified_activity_events_insert ON public.unified_activity_events;
CREATE POLICY unified_activity_events_insert ON public.unified_activity_events
  FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS unified_activity_events_service ON public.unified_activity_events;
CREATE POLICY unified_activity_events_service ON public.unified_activity_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
