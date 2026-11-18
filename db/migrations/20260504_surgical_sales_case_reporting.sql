-- Surgical sales case reporting (no PHI: no patient name, DOB, MRN).
-- Extends public.accounts with optional CRM fields; new tables are surgical_sales_* only
-- (does not modify public.products / product_variants used by orders).

-- -----------------------------------------------------------------------------
-- 1) Account extensions (portal accounts.id — same entity for cases.account_id)
-- -----------------------------------------------------------------------------
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS surgical_crm_type text,
  ADD COLUMN IF NOT EXISTS surgical_crm_billing_address text,
  ADD COLUMN IF NOT EXISTS surgical_crm_shipping_address text,
  ADD COLUMN IF NOT EXISTS surgical_crm_phone text,
  ADD COLUMN IF NOT EXISTS surgical_crm_website text,
  ADD COLUMN IF NOT EXISTS surgical_crm_status text,
  ADD COLUMN IF NOT EXISTS surgical_crm_notes text,
  ADD COLUMN IF NOT EXISTS surgical_crm_created_by uuid,
  ADD COLUMN IF NOT EXISTS surgical_crm_updated_at timestamptz;

COMMENT ON COLUMN public.accounts.surgical_crm_type IS
  'Surgical CRM: hospital | asc | clinic | distributor | other';
COMMENT ON COLUMN public.accounts.surgical_crm_status IS
  'Surgical CRM: active | inactive | prospect';

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_surgical_crm_type_check;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_surgical_crm_type_check
  CHECK (surgical_crm_type IS NULL OR surgical_crm_type IN ('hospital', 'asc', 'clinic', 'distributor', 'other'));

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_surgical_crm_status_check;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_surgical_crm_status_check
  CHECK (surgical_crm_status IS NULL OR surgical_crm_status IN ('active', 'inactive', 'prospect'));

CREATE INDEX IF NOT EXISTS idx_accounts_surgical_crm_status
  ON public.accounts (surgical_crm_status)
  WHERE surgical_crm_status IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2) CRM contacts (separate from account_contacts / IVR — no behavior change there)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.surgical_sales_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  title text,
  email text,
  phone text,
  role_type text NOT NULL DEFAULT 'other',
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_contacts_role_type_check
    CHECK (
      role_type IN (
        'surgeon',
        'office_manager',
        'purchasing',
        'billing',
        'or_staff',
        'administrator',
        'other'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_contacts_account_id
  ON public.surgical_sales_contacts (account_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_contacts_email
  ON public.surgical_sales_contacts (email)
  WHERE email IS NOT NULL;

COMMENT ON TABLE public.surgical_sales_contacts IS
  'Surgical sales CRM contacts per account (not PHI; distinct from account_contacts).';

-- -----------------------------------------------------------------------------
-- 3) Surgical catalog products & SKUs (not public.products)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.surgical_sales_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS surgical_sales_products_name_unique
  ON public.surgical_sales_products (lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_surgical_sales_products_active
  ON public.surgical_sales_products (active)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS public.surgical_sales_product_skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.surgical_sales_products (id) ON DELETE CASCADE,
  sku text NOT NULL,
  description text,
  unit_of_measure text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_product_skus_sku_unique UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_product_skus_product_id
  ON public.surgical_sales_product_skus (product_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_product_skus_active
  ON public.surgical_sales_product_skus (active)
  WHERE active = true;

-- Seed product families (idempotent by name)
INSERT INTO public.surgical_sales_products (name, category, description, active)
SELECT v.name, 'family', v.description, true
FROM (
  VALUES
    ('ACSIS', 'Surgical product family'),
    ('Endolumik', 'Surgical product family'),
    ('Skeletal Dynamics', 'Surgical product family'),
    ('BioTissue', 'Surgical product family'),
    ('TelaBio', 'Surgical product family')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.surgical_sales_products p WHERE lower(trim(p.name)) = lower(trim(v.name))
);

-- Seed SKUs (idempotent by sku)
INSERT INTO public.surgical_sales_product_skus (product_id, sku, description, unit_of_measure, active)
SELECT p.id, v.sku, v.description, v.uom, true
FROM public.surgical_sales_products p
JOIN (
  VALUES
    (
      'ACSIS',
      '4201',
      'Adjustable Curve Suction Irrigation Sleeve-Long (Robotic), 7.75mm O.D x 440mm',
      'ea'
    ),
    (
      'ACSIS',
      '4202',
      'Adjustable Curve Suction Irrigation Sleeve-Standard, 7.75mm O.D x 320mm',
      'ea'
    ),
    (
      'Endolumik',
      'EGCT40',
      'Endolumik Gastric Calibration Tube, 40 French, 5 per box',
      'box'
    ),
    (
      'Endolumik',
      'EGCT36',
      'Endolumik Gastric Calibration Tube, 36 French, 5 per box',
      'box'
    ),
    (
      'Endolumik',
      'EGCT40M',
      'Endolumik Gastric Calibration Tube, 40 French, M Series, 5 per box',
      'box'
    ),
    (
      'Endolumik',
      'EGCT36M',
      'Endolumik Gastric Calibration Tube, 36 French, M Series, 5 per box',
      'box'
    )
) AS v(family, sku, description, uom)
  ON lower(trim(p.name)) = lower(trim(v.family))
WHERE NOT EXISTS (SELECT 1 FROM public.surgical_sales_product_skus s WHERE s.sku = v.sku);

-- -----------------------------------------------------------------------------
-- 4) Case number sequence + surgical cases
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.surgical_sales_case_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.surgical_sales_set_case_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.case_number IS NULL OR btrim(NEW.case_number) = '' THEN
    NEW.case_number :=
      'SC-'
      || to_char(timezone('UTC', now()), 'YYYYMMDD')
      || '-'
      || lpad(nextval('public.surgical_sales_case_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.surgical_sales_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  surgeon_contact_id uuid REFERENCES public.surgical_sales_contacts (id) ON DELETE SET NULL,
  sales_rep_id uuid NOT NULL,
  case_date date,
  case_time time without time zone,
  procedure_type text,
  product_id uuid REFERENCES public.surgical_sales_products (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled',
  expected_revenue numeric(14, 2) NOT NULL DEFAULT 0 CHECK (expected_revenue >= 0),
  actual_revenue numeric(14, 2) CHECK (actual_revenue IS NULL OR actual_revenue >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_cases_status_check
    CHECK (
      status IN (
        'scheduled',
        'confirmed',
        'completed',
        'docs_needed',
        'billing_review',
        'invoiced',
        'closed',
        'cancelled'
      )
    ),
  CONSTRAINT surgical_sales_cases_case_number_unique UNIQUE (case_number)
);

DROP TRIGGER IF EXISTS surgical_sales_cases_set_case_number ON public.surgical_sales_cases;

CREATE TRIGGER surgical_sales_cases_set_case_number
  BEFORE INSERT ON public.surgical_sales_cases
  FOR EACH ROW
  EXECUTE PROCEDURE public.surgical_sales_set_case_number();

COMMENT ON TABLE public.surgical_sales_cases IS
  'Surgical sales cases; no PHI columns. sales_rep_id matches auth user id for reps.';

CREATE INDEX IF NOT EXISTS idx_surgical_sales_cases_account_id
  ON public.surgical_sales_cases (account_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_cases_case_date
  ON public.surgical_sales_cases (case_date);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_cases_sales_rep_id
  ON public.surgical_sales_cases (sales_rep_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_cases_status
  ON public.surgical_sales_cases (status);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_cases_product_id
  ON public.surgical_sales_cases (product_id);

-- -----------------------------------------------------------------------------
-- 5) Line items: products used on a case
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.surgical_sales_case_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.surgical_sales_cases (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.surgical_sales_products (id) ON DELETE RESTRICT,
  sku_id uuid REFERENCES public.surgical_sales_product_skus (id) ON DELETE SET NULL,
  expected_quantity numeric(14, 4),
  actual_quantity numeric(14, 4),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_case_products_case_id
  ON public.surgical_sales_case_products (case_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_case_products_product_id
  ON public.surgical_sales_case_products (product_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_case_products_sku_id
  ON public.surgical_sales_case_products (sku_id)
  WHERE sku_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6) Timeline / activities (no PHI in body)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.surgical_sales_case_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.surgical_sales_cases (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  body text NOT NULL DEFAULT '',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_case_activities_type_check
    CHECK (
      activity_type IN (
        'note',
        'status_change',
        'document_uploaded',
        'product_updated',
        'billing_update'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_case_activities_case_id
  ON public.surgical_sales_case_activities (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_case_activities_user_id
  ON public.surgical_sales_case_activities (user_id);

-- -----------------------------------------------------------------------------
-- 7) Case documents (PO, invoice, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.surgical_sales_case_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.surgical_sales_cases (id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text,
  storage_key text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_case_documents_type_check
    CHECK (
      document_type IN (
        'purchase_order',
        'invoice',
        'packing_slip',
        'consignment_form',
        'implant_log',
        'other'
      )
    ),
  CONSTRAINT surgical_sales_case_documents_storage_check
    CHECK (file_url IS NOT NULL OR storage_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_case_documents_case_id
  ON public.surgical_sales_case_documents (case_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 8) RLS (direct PostgREST): align with sales_opportunities-style access
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.surgical_sales_is_internal_portal_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
    );
$$;

CREATE OR REPLACE FUNCTION public.surgical_sales_is_internal_sales_rep()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal_sales_rep = true
  );
$$;

-- Contacts
ALTER TABLE public.surgical_sales_contacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_contacts TO authenticated;
GRANT ALL ON public.surgical_sales_contacts TO service_role;

DROP POLICY IF EXISTS surgical_sales_contacts_select ON public.surgical_sales_contacts;
CREATE POLICY surgical_sales_contacts_select ON public.surgical_sales_contacts
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT m.account_id FROM public.account_users m
      WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
    )
    OR (
      (SELECT public.surgical_sales_is_internal_sales_rep())
      AND EXISTS (
        SELECT 1 FROM public.surgical_sales_cases c
        WHERE c.account_id = surgical_sales_contacts.account_id
          AND c.sales_rep_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS surgical_sales_contacts_insert ON public.surgical_sales_contacts;
CREATE POLICY surgical_sales_contacts_insert ON public.surgical_sales_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT m.account_id FROM public.account_users m
      WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
    )
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
  );

DROP POLICY IF EXISTS surgical_sales_contacts_update ON public.surgical_sales_contacts;
CREATE POLICY surgical_sales_contacts_update ON public.surgical_sales_contacts
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT m.account_id FROM public.account_users m
      WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
    )
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
  );

DROP POLICY IF EXISTS surgical_sales_contacts_delete ON public.surgical_sales_contacts;
CREATE POLICY surgical_sales_contacts_delete ON public.surgical_sales_contacts
  FOR DELETE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

-- Catalog: read for reps + portal account members + admin/staff
ALTER TABLE public.surgical_sales_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgical_sales_product_skus ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_product_skus TO authenticated;
GRANT ALL ON public.surgical_sales_products TO service_role;
GRANT ALL ON public.surgical_sales_product_skus TO service_role;

DROP POLICY IF EXISTS surgical_sales_products_select ON public.surgical_sales_products;
CREATE POLICY surgical_sales_products_select ON public.surgical_sales_products
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
    OR EXISTS (SELECT 1 FROM public.account_users m WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL)
  );

DROP POLICY IF EXISTS surgical_sales_product_skus_select ON public.surgical_sales_product_skus;
CREATE POLICY surgical_sales_product_skus_select ON public.surgical_sales_product_skus
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
    OR EXISTS (SELECT 1 FROM public.account_users m WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL)
  );

DROP POLICY IF EXISTS surgical_sales_products_insert ON public.surgical_sales_products;
CREATE POLICY surgical_sales_products_insert ON public.surgical_sales_products
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.surgical_sales_is_internal_portal_admin()) OR (SELECT private.is_admin_or_staff()));

DROP POLICY IF EXISTS surgical_sales_products_update ON public.surgical_sales_products;
CREATE POLICY surgical_sales_products_update ON public.surgical_sales_products
  FOR UPDATE TO authenticated
  USING ((SELECT public.surgical_sales_is_internal_portal_admin()) OR (SELECT private.is_admin_or_staff()))
  WITH CHECK ((SELECT public.surgical_sales_is_internal_portal_admin()) OR (SELECT private.is_admin_or_staff()));

DROP POLICY IF EXISTS surgical_sales_products_delete ON public.surgical_sales_products;
CREATE POLICY surgical_sales_products_delete ON public.surgical_sales_products
  FOR DELETE TO authenticated
  USING ((SELECT public.surgical_sales_is_internal_portal_admin()) OR (SELECT private.is_admin_or_staff()));

DROP POLICY IF EXISTS surgical_sales_product_skus_insert ON public.surgical_sales_product_skus;
CREATE POLICY surgical_sales_product_skus_insert ON public.surgical_sales_product_skus
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.surgical_sales_is_internal_portal_admin()) OR (SELECT private.is_admin_or_staff()));

DROP POLICY IF EXISTS surgical_sales_product_skus_update ON public.surgical_sales_product_skus;
CREATE POLICY surgical_sales_product_skus_update ON public.surgical_sales_product_skus
  FOR UPDATE TO authenticated
  USING ((SELECT public.surgical_sales_is_internal_portal_admin()) OR (SELECT private.is_admin_or_staff()))
  WITH CHECK ((SELECT public.surgical_sales_is_internal_portal_admin()) OR (SELECT private.is_admin_or_staff()));

DROP POLICY IF EXISTS surgical_sales_product_skus_delete ON public.surgical_sales_product_skus;
CREATE POLICY surgical_sales_product_skus_delete ON public.surgical_sales_product_skus
  FOR DELETE TO authenticated
  USING ((SELECT public.surgical_sales_is_internal_portal_admin()) OR (SELECT private.is_admin_or_staff()));

-- Cases
ALTER TABLE public.surgical_sales_cases ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_cases TO authenticated;
GRANT ALL ON public.surgical_sales_cases TO service_role;

DROP POLICY IF EXISTS surgical_sales_cases_select ON public.surgical_sales_cases;
CREATE POLICY surgical_sales_cases_select ON public.surgical_sales_cases
  FOR SELECT TO authenticated
  USING (
    sales_rep_id = (SELECT auth.uid())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_cases_insert ON public.surgical_sales_cases;
CREATE POLICY surgical_sales_cases_insert ON public.surgical_sales_cases
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      sales_rep_id = (SELECT auth.uid())
      AND (SELECT public.surgical_sales_is_internal_sales_rep())
    )
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_cases_update ON public.surgical_sales_cases;
CREATE POLICY surgical_sales_cases_update ON public.surgical_sales_cases
  FOR UPDATE TO authenticated
  USING (
    sales_rep_id = (SELECT auth.uid())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  )
  WITH CHECK (
    (
      sales_rep_id = (SELECT auth.uid())
      AND (SELECT public.surgical_sales_is_internal_sales_rep())
    )
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_cases_delete ON public.surgical_sales_cases;
CREATE POLICY surgical_sales_cases_delete ON public.surgical_sales_cases
  FOR DELETE TO authenticated
  USING (
    sales_rep_id = (SELECT auth.uid())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

-- Case children: access via parent case visibility
ALTER TABLE public.surgical_sales_case_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgical_sales_case_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgical_sales_case_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_case_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_case_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_case_documents TO authenticated;
GRANT ALL ON public.surgical_sales_case_products TO service_role;
GRANT ALL ON public.surgical_sales_case_activities TO service_role;
GRANT ALL ON public.surgical_sales_case_documents TO service_role;

DROP POLICY IF EXISTS surgical_sales_case_products_select ON public.surgical_sales_case_products;
CREATE POLICY surgical_sales_case_products_select ON public.surgical_sales_case_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_products.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_products_insert ON public.surgical_sales_case_products;
CREATE POLICY surgical_sales_case_products_insert ON public.surgical_sales_case_products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_products.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_products_update ON public.surgical_sales_case_products;
CREATE POLICY surgical_sales_case_products_update ON public.surgical_sales_case_products
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_products.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_products_delete ON public.surgical_sales_case_products;
CREATE POLICY surgical_sales_case_products_delete ON public.surgical_sales_case_products
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_products.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_activities_select ON public.surgical_sales_case_activities;
CREATE POLICY surgical_sales_case_activities_select ON public.surgical_sales_case_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_activities.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_activities_insert ON public.surgical_sales_case_activities;
CREATE POLICY surgical_sales_case_activities_insert ON public.surgical_sales_case_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_activities.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
    AND user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS surgical_sales_case_activities_update ON public.surgical_sales_case_activities;
CREATE POLICY surgical_sales_case_activities_update ON public.surgical_sales_case_activities
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_activities.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_activities_delete ON public.surgical_sales_case_activities;
CREATE POLICY surgical_sales_case_activities_delete ON public.surgical_sales_case_activities
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_activities.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_documents_select ON public.surgical_sales_case_documents;
CREATE POLICY surgical_sales_case_documents_select ON public.surgical_sales_case_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_documents.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_documents_insert ON public.surgical_sales_case_documents;
CREATE POLICY surgical_sales_case_documents_insert ON public.surgical_sales_case_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_documents.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
    AND uploaded_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS surgical_sales_case_documents_update ON public.surgical_sales_case_documents;
CREATE POLICY surgical_sales_case_documents_update ON public.surgical_sales_case_documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_documents.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_documents_delete ON public.surgical_sales_case_documents;
CREATE POLICY surgical_sales_case_documents_delete ON public.surgical_sales_case_documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_documents.case_id
        AND (
          c.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );
