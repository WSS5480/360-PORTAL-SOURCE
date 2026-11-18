-- Organization-level product approval tracking (hospital VAC / formulary status).

CREATE TABLE IF NOT EXISTS public.sales_organization_product_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.surgical_sales_products (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'not_started',
  champion_contact_id uuid NULL REFERENCES public.surgical_sales_contacts (id) ON DELETE SET NULL,
  submitted_at timestamptz NULL,
  approved_at timestamptz NULL,
  notes text NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_organization_product_approvals_status_check CHECK (
    status IN (
      'not_started',
      'in_progress',
      'submitted',
      'under_review',
      'approved',
      'denied'
    )
  ),
  CONSTRAINT sales_organization_product_approvals_unique_org_product UNIQUE (organization_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_org_product_approvals_org
  ON public.sales_organization_product_approvals (organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_org_product_approvals_status
  ON public.sales_organization_product_approvals (organization_id, status);

COMMENT ON TABLE public.sales_organization_product_approvals IS
  'Tracks hospital VAC / formulary approval status for a product at a Sales Command organization.';

ALTER TABLE public.sales_organization_product_approvals ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_organization_product_approvals TO authenticated;
GRANT ALL ON public.sales_organization_product_approvals TO service_role;

DROP POLICY IF EXISTS sales_org_product_approvals_select ON public.sales_organization_product_approvals;
CREATE POLICY sales_org_product_approvals_select ON public.sales_organization_product_approvals
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (
      (SELECT public.surgical_sales_is_internal_sales_rep())
      AND organization_id IN (
        SELECT o.id FROM public.sales_organizations o
        WHERE o.surgical_crm_created_by = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS sales_org_product_approvals_insert ON public.sales_organization_product_approvals;
CREATE POLICY sales_org_product_approvals_insert ON public.sales_organization_product_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT public.surgical_sales_is_internal_sales_rep())
      AND created_by_user_id = (SELECT auth.uid())
      AND organization_id IN (
        SELECT o.id FROM public.sales_organizations o
        WHERE o.surgical_crm_created_by = (SELECT auth.uid())
      )
    )
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
  );

DROP POLICY IF EXISTS sales_org_product_approvals_update ON public.sales_organization_product_approvals;
CREATE POLICY sales_org_product_approvals_update ON public.sales_organization_product_approvals
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (
      (SELECT public.surgical_sales_is_internal_sales_rep())
      AND organization_id IN (
        SELECT o.id FROM public.sales_organizations o
        WHERE o.surgical_crm_created_by = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (
      (SELECT public.surgical_sales_is_internal_sales_rep())
      AND organization_id IN (
        SELECT o.id FROM public.sales_organizations o
        WHERE o.surgical_crm_created_by = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS sales_org_product_approvals_delete ON public.sales_organization_product_approvals;
CREATE POLICY sales_org_product_approvals_delete ON public.sales_organization_product_approvals
  FOR DELETE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (
      (SELECT public.surgical_sales_is_internal_sales_rep())
      AND organization_id IN (
        SELECT o.id FROM public.sales_organizations o
        WHERE o.surgical_crm_created_by = (SELECT auth.uid())
      )
    )
  );
