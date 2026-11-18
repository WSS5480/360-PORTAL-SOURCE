-- Sales Command only: link opportunities to Surgical CRM organizations (accounts).
-- Keeps non-sales account behavior unchanged.

ALTER TABLE public.sales_opportunities
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_opportunities_account_id
  ON public.sales_opportunities (account_id);

-- Best-effort backfill for existing opportunities by exact organization name match.
UPDATE public.sales_opportunities o
SET account_id = a.id
FROM public.accounts a
WHERE o.account_id IS NULL
  AND lower(btrim(o.account_name)) = lower(btrim(a.name))
  AND a.surgical_crm_archived_at IS NULL
  AND coalesce(lower(a.surgical_crm_status), '') <> 'inactive';

COMMENT ON COLUMN public.sales_opportunities.account_id IS
  'Optional link to CRM organization (accounts.id) used by Sales Command.';
