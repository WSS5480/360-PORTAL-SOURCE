-- Surgical CRM: archive timestamps, billing city/state, contact provenance for edit rules.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS surgical_crm_archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS surgical_crm_billing_city text,
  ADD COLUMN IF NOT EXISTS surgical_crm_billing_state text;

COMMENT ON COLUMN public.accounts.surgical_crm_archived_at IS
  'When set, account is archived from surgical CRM lists (independent of surgical_crm_status).';

ALTER TABLE public.surgical_sales_contacts
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

COMMENT ON COLUMN public.surgical_sales_contacts.created_by_user_id IS
  'Auth user who created the row; reps may edit only their own (enforced in API).';

CREATE INDEX IF NOT EXISTS idx_surgical_sales_contacts_account_active
  ON public.surgical_sales_contacts (account_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_surgical_crm_archived
  ON public.accounts (surgical_crm_archived_at)
  WHERE surgical_crm_archived_at IS NULL;
