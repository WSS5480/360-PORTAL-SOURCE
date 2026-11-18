-- Optional planning model: planning_mode, planning_status, and related fields.

-- Rename briefing_status → planning_status when present (migration 20260648).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'surgical_sales_engagements'
      AND column_name = 'briefing_status'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'surgical_sales_engagements'
      AND column_name = 'planning_status'
  ) THEN
    ALTER TABLE public.surgical_sales_engagements RENAME COLUMN briefing_status TO planning_status;
    ALTER INDEX IF EXISTS idx_surgical_sales_engagements_briefing_status
      RENAME TO idx_surgical_sales_engagements_planning_status;
    ALTER TABLE public.surgical_sales_engagements
      DROP CONSTRAINT IF EXISTS surgical_sales_engagements_briefing_status_check;
  END IF;
END $$;

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS planning_status text NOT NULL DEFAULT 'not_planned';

ALTER TABLE public.surgical_sales_engagements
  DROP CONSTRAINT IF EXISTS surgical_sales_engagements_planning_status_check;

ALTER TABLE public.surgical_sales_engagements
  ADD CONSTRAINT surgical_sales_engagements_planning_status_check CHECK (
    planning_status IN ('not_planned', 'planning_in_progress', 'planned')
  );

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS planning_mode text NOT NULL DEFAULT 'plan_first';

ALTER TABLE public.surgical_sales_engagements
  DROP CONSTRAINT IF EXISTS surgical_sales_engagements_planning_mode_check;

ALTER TABLE public.surgical_sales_engagements
  ADD CONSTRAINT surgical_sales_engagements_planning_mode_check CHECK (
    planning_mode IN ('quick_add', 'plan_first')
  );

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS engagement_category text;

ALTER TABLE public.surgical_sales_engagements
  DROP CONSTRAINT IF EXISTS surgical_sales_engagements_engagement_category_check;

ALTER TABLE public.surgical_sales_engagements
  ADD CONSTRAINT surgical_sales_engagements_engagement_category_check CHECK (
    engagement_category IS NULL
    OR engagement_category IN (
      'observation_discovery',
      'product_evaluation',
      'relationship_management'
    )
  );

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS briefing_id uuid REFERENCES public.surgical_sales_engagements (id) ON DELETE SET NULL;

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS source_observation_id uuid REFERENCES public.surgical_sales_engagements (id) ON DELETE SET NULL;

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS product_focus text;

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS scheduled_date date;

COMMENT ON COLUMN public.surgical_sales_engagements.planning_mode IS
  'How the engagement was created: quick_add (no prep) or plan_first (wizard).';

COMMENT ON COLUMN public.surgical_sales_engagements.planning_status IS
  'Planning lifecycle: not_planned, planning_in_progress, planned (briefing ready).';

COMMENT ON COLUMN public.surgical_sales_engagements.briefing_id IS
  'Self-reference when a field briefing is attached (planning_status = planned).';

COMMENT ON COLUMN public.surgical_sales_engagements.source_observation_id IS
  'Optional link to the source observation engagement (e.g. Observation Debrief).';

COMMENT ON COLUMN public.surgical_sales_engagements.product_focus IS
  'Optional product line or focus for this touchpoint.';

COMMENT ON COLUMN public.surgical_sales_engagements.scheduled_date IS
  'Calendar date for the touchpoint (mirrors engagement_date when set).';

-- Backfill scheduled_date from engagement_date.
UPDATE public.surgical_sales_engagements
SET scheduled_date = engagement_date::date
WHERE scheduled_date IS NULL
  AND engagement_date IS NOT NULL;

-- Backfill planning_status from prep signals (legacy-safe).
UPDATE public.surgical_sales_engagements
SET planning_status = 'planned'
WHERE prepared_at IS NOT NULL
  AND planning_status <> 'planned';

UPDATE public.surgical_sales_engagements
SET planning_status = 'planning_in_progress'
WHERE planning_status = 'not_planned'
  AND pre_call_plan_updated_at IS NOT NULL;

-- Backfill planning_mode: no prep signals → quick_add; otherwise plan_first.
UPDATE public.surgical_sales_engagements
SET planning_mode = 'quick_add'
WHERE planning_status = 'not_planned'
  AND prepared_at IS NULL
  AND pre_call_plan_updated_at IS NULL
  AND pre_call_plan_template_id IS NULL;

-- Backfill briefing_id for planned engagements.
UPDATE public.surgical_sales_engagements
SET briefing_id = id
WHERE planning_status = 'planned'
  AND briefing_id IS NULL;

-- Backfill engagement_category from engagement_type.
UPDATE public.surgical_sales_engagements
SET engagement_category = CASE engagement_type
  WHEN 'intro_call' THEN 'observation_discovery'
  WHEN 'observation_request' THEN 'observation_discovery'
  WHEN 'or_visit' THEN 'observation_discovery'
  WHEN 'provider_debrief' THEN 'observation_discovery'
  WHEN 'product_demo' THEN 'product_evaluation'
  WHEN 'in_service_training' THEN 'product_evaluation'
  WHEN 'post_case_follow_up' THEN 'product_evaluation'
  WHEN 'follow_up' THEN 'relationship_management'
  WHEN 'reactivation' THEN 'relationship_management'
  WHEN 'office_visit_360' THEN 'relationship_management'
  ELSE engagement_category
END
WHERE engagement_category IS NULL;

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_planning_status
  ON public.surgical_sales_engagements (planning_status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_planning_mode
  ON public.surgical_sales_engagements (planning_mode)
  WHERE archived_at IS NULL;
