-- Extend surgical CRM organization type enum and add optional billing postal code.

ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_surgical_crm_type_check;
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_surgical_crm_type_check
  CHECK (
    surgical_crm_type IS NULL
    OR surgical_crm_type IN ('hospital', 'asc', 'clinic', 'practice', 'distributor', 'other')
  );

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS surgical_crm_billing_postal_code text;

COMMENT ON COLUMN public.accounts.surgical_crm_billing_postal_code IS
  'Optional billing ZIP / postal code for surgical CRM directory.';
