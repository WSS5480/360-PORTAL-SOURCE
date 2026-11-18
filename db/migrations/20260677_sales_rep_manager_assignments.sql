-- Sales rep → territory manager roster (one manager per field rep).
CREATE TABLE IF NOT EXISTS public.sales_rep_manager_assignments (
  rep_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  manager_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rep_user_id),
  CONSTRAINT sales_rep_manager_assignments_no_self_chk CHECK (rep_user_id <> manager_user_id)
);

CREATE INDEX IF NOT EXISTS sales_rep_manager_assignments_manager_idx
  ON public.sales_rep_manager_assignments (manager_user_id);

COMMENT ON TABLE public.sales_rep_manager_assignments IS
  'Field sales rep reporting line to a territory manager. Each rep has at most one manager.';

ALTER TABLE public.sales_rep_manager_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_rep_manager_assignments_select_authenticated ON public.sales_rep_manager_assignments;
CREATE POLICY sales_rep_manager_assignments_select_authenticated
  ON public.sales_rep_manager_assignments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS sales_rep_manager_assignments_admin_write ON public.sales_rep_manager_assignments;
CREATE POLICY sales_rep_manager_assignments_admin_write
  ON public.sales_rep_manager_assignments FOR ALL
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
