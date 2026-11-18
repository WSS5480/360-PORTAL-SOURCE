-- Sales Command organizations live in sales_organizations, not ordering customer accounts.
-- Preserves existing UUIDs so case/contact/opportunity FKs keep working after repoint.

CREATE TABLE IF NOT EXISTS public.sales_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  surgical_crm_type text,
  surgical_crm_billing_address text,
  surgical_crm_shipping_address text,
  surgical_crm_phone text,
  surgical_crm_website text,
  surgical_crm_status text,
  surgical_crm_notes text,
  surgical_crm_created_by uuid,
  surgical_crm_updated_at timestamptz,
  surgical_crm_archived_at timestamptz,
  surgical_crm_archived_by uuid,
  surgical_crm_billing_city text,
  surgical_crm_billing_state text,
  surgical_crm_billing_postal_code text,
  linked_ordering_account_id uuid REFERENCES public.accounts (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_organizations
  DROP CONSTRAINT IF EXISTS sales_organizations_surgical_crm_type_check;

ALTER TABLE public.sales_organizations
  ADD CONSTRAINT sales_organizations_surgical_crm_type_check
  CHECK (
    surgical_crm_type IS NULL
    OR surgical_crm_type IN ('hospital', 'asc', 'clinic', 'practice', 'distributor', 'other')
  );

ALTER TABLE public.sales_organizations
  DROP CONSTRAINT IF EXISTS sales_organizations_surgical_crm_status_check;

ALTER TABLE public.sales_organizations
  ADD CONSTRAINT sales_organizations_surgical_crm_status_check
  CHECK (
    surgical_crm_status IS NULL
    OR surgical_crm_status IN ('active', 'inactive', 'prospect')
  );

CREATE INDEX IF NOT EXISTS idx_sales_organizations_status
  ON public.sales_organizations (surgical_crm_status)
  WHERE surgical_crm_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_organizations_archived
  ON public.sales_organizations (surgical_crm_archived_at)
  WHERE surgical_crm_archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sales_organizations_linked_ordering_account
  ON public.sales_organizations (linked_ordering_account_id)
  WHERE linked_ordering_account_id IS NOT NULL;

COMMENT ON TABLE public.sales_organizations IS
  'Sales Command organizations (facilities/sites). Separate from ordering customer accounts.';
COMMENT ON COLUMN public.sales_organizations.linked_ordering_account_id IS
  'When this org is also an ordering customer, points at public.accounts.id.';

-- Migrate legacy CRM rows from accounts (same ids).
INSERT INTO public.sales_organizations (
  id,
  name,
  discount_percent,
  surgical_crm_type,
  surgical_crm_billing_address,
  surgical_crm_shipping_address,
  surgical_crm_phone,
  surgical_crm_website,
  surgical_crm_status,
  surgical_crm_notes,
  surgical_crm_created_by,
  surgical_crm_updated_at,
  surgical_crm_archived_at,
  surgical_crm_archived_by,
  surgical_crm_billing_city,
  surgical_crm_billing_state,
  surgical_crm_billing_postal_code,
  linked_ordering_account_id,
  created_at
)
SELECT
  a.id,
  a.name,
  COALESCE(a.discount_percent, 0),
  a.surgical_crm_type,
  a.surgical_crm_billing_address,
  a.surgical_crm_shipping_address,
  a.surgical_crm_phone,
  a.surgical_crm_website,
  a.surgical_crm_status,
  a.surgical_crm_notes,
  a.surgical_crm_created_by,
  a.surgical_crm_updated_at,
  a.surgical_crm_archived_at,
  a.surgical_crm_archived_by,
  a.surgical_crm_billing_city,
  a.surgical_crm_billing_state,
  a.surgical_crm_billing_postal_code,
  CASE
    WHEN EXISTS (SELECT 1 FROM public.orders o WHERE o.account_id = a.id)
      OR EXISTS (SELECT 1 FROM public.account_users au WHERE au.account_id = a.id)
      OR EXISTS (SELECT 1 FROM public.ivr_requests ivr WHERE ivr.account_id = a.id)
    THEN a.id
    ELSE NULL
  END,
  COALESCE(a.created_at, now())
FROM public.accounts a
WHERE a.surgical_crm_created_by IS NOT NULL
   OR a.surgical_crm_type IS NOT NULL
   OR a.surgical_crm_status IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Repoint Sales Command FKs from accounts -> sales_organizations.
ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_account_id_fkey;
ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.sales_organizations (id) ON DELETE CASCADE;

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_organization_id_fkey;
ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.sales_organizations (id) ON DELETE SET NULL;

ALTER TABLE public.surgical_sales_contact_organizations
  DROP CONSTRAINT IF EXISTS surgical_sales_contact_organizations_account_id_fkey;
ALTER TABLE public.surgical_sales_contact_organizations
  ADD CONSTRAINT surgical_sales_contact_organizations_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.sales_organizations (id) ON DELETE CASCADE;

ALTER TABLE public.surgical_sales_cases
  DROP CONSTRAINT IF EXISTS surgical_sales_cases_account_id_fkey;
ALTER TABLE public.surgical_sales_cases
  ADD CONSTRAINT surgical_sales_cases_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.sales_organizations (id) ON DELETE RESTRICT;

ALTER TABLE public.sales_opportunities
  DROP CONSTRAINT IF EXISTS sales_opportunities_account_id_fkey;
ALTER TABLE public.sales_opportunities
  ADD CONSTRAINT sales_opportunities_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.sales_organizations (id) ON DELETE SET NULL;

ALTER TABLE public.surgical_sales_engagements
  DROP CONSTRAINT IF EXISTS surgical_sales_engagements_organization_id_fkey;
ALTER TABLE public.surgical_sales_engagements
  ADD CONSTRAINT surgical_sales_engagements_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.sales_organizations (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sales_opportunities.account_id IS
  'Optional link to Sales Command organization (sales_organizations.id).';

COMMENT ON COLUMN public.surgical_sales_engagements.organization_id IS
  'Sales Command organization (sales_organizations.id) when known.';

-- Remove sales-only shadow rows from ordering accounts (keep dual-use ordering rows).
DELETE FROM public.account_pricing ap
USING public.sales_organizations so
WHERE ap.account_id = so.id
  AND so.linked_ordering_account_id IS NULL;

DELETE FROM public.accounts a
USING public.sales_organizations so
WHERE a.id = so.id
  AND so.linked_ordering_account_id IS NULL;

-- Strip CRM metadata from ordering accounts that remain linked to a sales org.
UPDATE public.accounts a
SET
  discount_percent = COALESCE(a.discount_percent, 0),
  surgical_crm_type = NULL,
  surgical_crm_billing_address = NULL,
  surgical_crm_shipping_address = NULL,
  surgical_crm_phone = NULL,
  surgical_crm_website = NULL,
  surgical_crm_status = NULL,
  surgical_crm_notes = NULL,
  surgical_crm_created_by = NULL,
  surgical_crm_updated_at = NULL,
  surgical_crm_archived_at = NULL,
  surgical_crm_archived_by = NULL,
  surgical_crm_billing_city = NULL,
  surgical_crm_billing_state = NULL,
  surgical_crm_billing_postal_code = NULL
FROM public.sales_organizations so
WHERE so.linked_ordering_account_id = a.id;
