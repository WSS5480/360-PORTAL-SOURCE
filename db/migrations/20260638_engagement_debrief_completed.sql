-- Track tactical debrief completion on engagements (overview + workflow).

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS debrief_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS debrief_completed_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS surgical_sales_engagements_debrief_completed_idx
  ON public.surgical_sales_engagements (provider_id, debrief_completed)
  WHERE archived_at IS NULL;
