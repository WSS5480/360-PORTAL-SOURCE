-- Structured tactical asks for Prepare for Meeting (per-question status, source, answers).

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS prepare_tactical_asks jsonb NULL;

COMMENT ON COLUMN public.surgical_sales_engagements.prepare_tactical_asks IS
  'Structured Top Asks rows: source (ai_recommended|custom), status, dismiss reason, field answer summary.';
