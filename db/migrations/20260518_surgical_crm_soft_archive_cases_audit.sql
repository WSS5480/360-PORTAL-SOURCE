-- Soft-archive surgical cases; track who archived CRM organizations; extend case activity types.

ALTER TABLE public.surgical_sales_cases
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by_user_id uuid;

COMMENT ON COLUMN public.surgical_sales_cases.archived_at IS
  'When set, case is hidden from default rep lists but history, documents, and activities remain.';
COMMENT ON COLUMN public.surgical_sales_cases.archived_by_user_id IS
  'User who archived the case (portal rep or admin).';

CREATE INDEX IF NOT EXISTS idx_surgical_sales_cases_archived_at
  ON public.surgical_sales_cases (archived_at)
  WHERE archived_at IS NULL;

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS surgical_crm_archived_by uuid;

COMMENT ON COLUMN public.accounts.surgical_crm_archived_by IS
  'User who archived this organization in surgical CRM (optional audit).';

ALTER TABLE public.surgical_sales_case_activities
  DROP CONSTRAINT IF EXISTS surgical_sales_case_activities_type_check;

ALTER TABLE public.surgical_sales_case_activities
  ADD CONSTRAINT surgical_sales_case_activities_type_check
  CHECK (
    activity_type IN (
      'note',
      'status_change',
      'document_uploaded',
      'document_deleted',
      'product_updated',
      'billing_update',
      'case_created',
      'case_updated',
      'case_archived',
      'case_restored'
    )
  );
