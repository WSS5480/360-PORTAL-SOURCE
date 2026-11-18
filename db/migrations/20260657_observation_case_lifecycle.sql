-- Observation case lifecycle timestamps (explicit rep-driven workflow).

ALTER TABLE public.surgical_sales_cases
  ADD COLUMN IF NOT EXISTS observation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS observation_completed_at timestamptz;

COMMENT ON COLUMN public.surgical_sales_cases.observation_started_at IS
  'When the rep explicitly started the observation (status moved to in-progress / confirmed).';

COMMENT ON COLUMN public.surgical_sales_cases.observation_completed_at IS
  'When the rep marked the observation complete (status moved to completed).';
