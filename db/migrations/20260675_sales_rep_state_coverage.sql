-- Per-rep US state coverage for sales territory planning.
CREATE TABLE IF NOT EXISTS public.sales_rep_state_coverage (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  state_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, state_code),
  CONSTRAINT sales_rep_state_coverage_state_code_chk CHECK (state_code ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS sales_rep_state_coverage_state_code_idx
  ON public.sales_rep_state_coverage (state_code);

COMMENT ON TABLE public.sales_rep_state_coverage IS
  'US states each internal sales rep covers. Used by admin setup territory map and future manager visibility.';

ALTER TABLE public.sales_rep_state_coverage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_rep_state_coverage_select_authenticated ON public.sales_rep_state_coverage;
CREATE POLICY sales_rep_state_coverage_select_authenticated
  ON public.sales_rep_state_coverage FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS sales_rep_state_coverage_admin_write ON public.sales_rep_state_coverage;
CREATE POLICY sales_rep_state_coverage_admin_write
  ON public.sales_rep_state_coverage FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_users iu
      WHERE iu.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.internal_users iu
      WHERE iu.user_id = (SELECT auth.uid())
    )
  );
