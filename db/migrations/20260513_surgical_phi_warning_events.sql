-- Heuristic PHI-pattern advisory events (no raw note text or filenames stored).

CREATE TABLE IF NOT EXISTS public.surgical_sales_phi_warning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NOT NULL,
  case_id uuid REFERENCES public.surgical_sales_cases (id) ON DELETE SET NULL,
  surface text NOT NULL,
  detected_kinds text[] NOT NULL DEFAULT '{}'::text[]
);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_phi_warning_created_at
  ON public.surgical_sales_phi_warning_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_phi_warning_case_id
  ON public.surgical_sales_phi_warning_events (case_id)
  WHERE case_id IS NOT NULL;

COMMENT ON TABLE public.surgical_sales_phi_warning_events IS
  'Advisory log when free text or filenames matched PHI-like heuristics (SSN/DOB/MRN-style).';

ALTER TABLE public.surgical_sales_phi_warning_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.surgical_sales_phi_warning_events TO service_role;
