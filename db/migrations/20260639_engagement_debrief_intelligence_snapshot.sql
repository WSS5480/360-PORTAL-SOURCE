-- Persist debrief AI extraction for review mode (operational memory, not re-capture).

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS debrief_intelligence_snapshot jsonb NULL;

COMMENT ON COLUMN public.surgical_sales_engagements.debrief_intelligence_snapshot IS
  'Serialized tactical debrief extraction review (log update mapping, discovery context, proposed contacts) for completed debrief review mode.';
