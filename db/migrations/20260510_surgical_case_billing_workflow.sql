-- Admin billing review + notes on surgical cases (reps read-only in portal).

ALTER TABLE public.surgical_sales_cases
  ADD COLUMN IF NOT EXISTS billing_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_reviewed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS billing_admin_notes text;

COMMENT ON COLUMN public.surgical_sales_cases.billing_reviewed_at IS
  'When internal admin marked billing review complete for this case.';
COMMENT ON COLUMN public.surgical_sales_cases.billing_reviewed_by_user_id IS
  'Auth user who set billing_reviewed_at.';
COMMENT ON COLUMN public.surgical_sales_cases.billing_admin_notes IS
  'Internal billing notes (admin-only write via API).';

CREATE INDEX IF NOT EXISTS idx_surgical_sales_cases_billing_reviewed_at
  ON public.surgical_sales_cases (billing_reviewed_at)
  WHERE billing_reviewed_at IS NOT NULL;
