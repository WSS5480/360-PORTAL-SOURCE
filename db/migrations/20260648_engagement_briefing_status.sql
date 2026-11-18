-- Engagement field briefing lifecycle — Quick Add vs Plan First.

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS briefing_status text NOT NULL DEFAULT 'not_planned';

ALTER TABLE public.surgical_sales_engagements
  DROP CONSTRAINT IF EXISTS surgical_sales_engagements_briefing_status_check;

ALTER TABLE public.surgical_sales_engagements
  ADD CONSTRAINT surgical_sales_engagements_briefing_status_check CHECK (
    briefing_status IN ('not_planned', 'planning_in_progress', 'planned')
  );

COMMENT ON COLUMN public.surgical_sales_engagements.briefing_status IS
  'Field briefing lifecycle: not_planned (Quick Add / no prep), planning_in_progress, planned (briefing ready).';

-- Backfill from existing prep signals.
UPDATE public.surgical_sales_engagements
SET briefing_status = 'planned'
WHERE prepared_at IS NOT NULL;

UPDATE public.surgical_sales_engagements
SET briefing_status = 'planning_in_progress'
WHERE briefing_status = 'not_planned'
  AND pre_call_plan_updated_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_briefing_status
  ON public.surgical_sales_engagements (briefing_status)
  WHERE archived_at IS NULL;
