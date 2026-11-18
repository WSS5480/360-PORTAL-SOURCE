-- Shared Sales Command visibility for internal sales reps.
-- Creators still attribute orgs/providers/cases via ownership columns on INSERT;
-- all internal sales reps may SELECT/UPDATE shared CRM rows for collaboration.

-- ---------------------------------------------------------------------------
-- Opportunities
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sales_opportunities_select ON public.sales_opportunities;
CREATE POLICY sales_opportunities_select ON public.sales_opportunities
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
    )
  );

DROP POLICY IF EXISTS sales_opportunities_update ON public.sales_opportunities;
CREATE POLICY sales_opportunities_update ON public.sales_opportunities
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
    )
  )
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
    )
  );

DROP POLICY IF EXISTS sales_opportunities_delete ON public.sales_opportunities;
CREATE POLICY sales_opportunities_delete ON public.sales_opportunities
  FOR DELETE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
    )
  );

-- INSERT still requires owner_user_id = auth.uid() for attribution (unchanged from prior policy).

-- ---------------------------------------------------------------------------
-- Tasks / activities (via opportunity team visibility)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sales_tasks_select ON public.sales_tasks;
CREATE POLICY sales_tasks_select ON public.sales_tasks FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_tasks.opportunity_id
      AND (
        (SELECT public.surgical_sales_is_internal_sales_rep())
        OR (SELECT public.surgical_sales_is_internal_portal_admin())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_tasks_insert ON public.sales_tasks;
CREATE POLICY sales_tasks_insert ON public.sales_tasks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_tasks.opportunity_id
      AND (
        (SELECT public.surgical_sales_is_internal_sales_rep())
        OR (SELECT public.surgical_sales_is_internal_portal_admin())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
  AND owner_user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS sales_tasks_update ON public.sales_tasks;
CREATE POLICY sales_tasks_update ON public.sales_tasks FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_tasks.opportunity_id
      AND (
        (SELECT public.surgical_sales_is_internal_sales_rep())
        OR (SELECT public.surgical_sales_is_internal_portal_admin())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_tasks_delete ON public.sales_tasks;
CREATE POLICY sales_tasks_delete ON public.sales_tasks FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_tasks.opportunity_id
      AND (
        (SELECT public.surgical_sales_is_internal_sales_rep())
        OR (SELECT public.surgical_sales_is_internal_portal_admin())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_activities_select ON public.sales_activities;
CREATE POLICY sales_activities_select ON public.sales_activities FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_activities.opportunity_id
      AND (
        (SELECT public.surgical_sales_is_internal_sales_rep())
        OR (SELECT public.surgical_sales_is_internal_portal_admin())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_activities_insert ON public.sales_activities;
CREATE POLICY sales_activities_insert ON public.sales_activities FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_activities.opportunity_id
      AND (
        (SELECT public.surgical_sales_is_internal_sales_rep())
        OR (SELECT public.surgical_sales_is_internal_portal_admin())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
  AND owner_user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS sales_activities_update ON public.sales_activities;
CREATE POLICY sales_activities_update ON public.sales_activities FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_activities.opportunity_id
      AND (
        (SELECT public.surgical_sales_is_internal_sales_rep())
        OR (SELECT public.surgical_sales_is_internal_portal_admin())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_activities_delete ON public.sales_activities;
CREATE POLICY sales_activities_delete ON public.sales_activities FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_activities.opportunity_id
      AND (
        (SELECT public.surgical_sales_is_internal_sales_rep())
        OR (SELECT public.surgical_sales_is_internal_portal_admin())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

-- ---------------------------------------------------------------------------
-- Contacts / providers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS surgical_sales_contacts_select ON public.surgical_sales_contacts;
CREATE POLICY surgical_sales_contacts_select ON public.surgical_sales_contacts
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
    OR account_id IN (
      SELECT m.account_id FROM public.account_users m
      WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- Cases (+ children inherit via EXISTS on case)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS surgical_sales_cases_select ON public.surgical_sales_cases;
CREATE POLICY surgical_sales_cases_select ON public.surgical_sales_cases
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_cases_update ON public.surgical_sales_cases;
CREATE POLICY surgical_sales_cases_update ON public.surgical_sales_cases
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  )
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_cases_delete ON public.surgical_sales_cases;
CREATE POLICY surgical_sales_cases_delete ON public.surgical_sales_cases
  FOR DELETE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

-- Case children: any internal sales rep who can see the parent case
DROP POLICY IF EXISTS surgical_sales_case_products_select ON public.surgical_sales_case_products;
CREATE POLICY surgical_sales_case_products_select ON public.surgical_sales_case_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_products.case_id
        AND (
          (SELECT public.surgical_sales_is_internal_sales_rep())
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
          (SELECT public.surgical_sales_is_internal_sales_rep())
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
          (SELECT public.surgical_sales_is_internal_sales_rep())
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
          (SELECT public.surgical_sales_is_internal_sales_rep())
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
          (SELECT public.surgical_sales_is_internal_sales_rep())
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
          (SELECT public.surgical_sales_is_internal_sales_rep())
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
          (SELECT public.surgical_sales_is_internal_sales_rep())
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
          (SELECT public.surgical_sales_is_internal_sales_rep())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_case_documents_update ON public.surgical_sales_case_documents;
CREATE POLICY surgical_sales_case_documents_update ON public.surgical_sales_case_documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.id = surgical_sales_case_documents.case_id
        AND (
          (SELECT public.surgical_sales_is_internal_sales_rep())
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
          (SELECT public.surgical_sales_is_internal_sales_rep())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Engagements
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS surgical_sales_engagements_select ON public.surgical_sales_engagements;
CREATE POLICY surgical_sales_engagements_select ON public.surgical_sales_engagements
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_engagements_update ON public.surgical_sales_engagements;
CREATE POLICY surgical_sales_engagements_update ON public.surgical_sales_engagements
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  )
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_sales_rep())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_engagement_activities_select ON public.surgical_sales_engagement_activities;
CREATE POLICY surgical_sales_engagement_activities_select ON public.surgical_sales_engagement_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_engagements e
      WHERE e.id = engagement_id
        AND (
          (SELECT public.surgical_sales_is_internal_sales_rep())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_engagement_activities_insert ON public.surgical_sales_engagement_activities;
CREATE POLICY surgical_sales_engagement_activities_insert ON public.surgical_sales_engagement_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_engagements e
      WHERE e.id = engagement_id
        AND (
          (SELECT public.surgical_sales_is_internal_sales_rep())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Organization product approvals
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sales_org_product_approvals_select ON public.sales_organization_product_approvals;
CREATE POLICY sales_org_product_approvals_select ON public.sales_organization_product_approvals
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
  );

DROP POLICY IF EXISTS sales_org_product_approvals_insert ON public.sales_organization_product_approvals;
CREATE POLICY sales_org_product_approvals_insert ON public.sales_organization_product_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT public.surgical_sales_is_internal_sales_rep())
      AND created_by_user_id = (SELECT auth.uid())
    )
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
  );

DROP POLICY IF EXISTS sales_org_product_approvals_update ON public.sales_organization_product_approvals;
CREATE POLICY sales_org_product_approvals_update ON public.sales_organization_product_approvals
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
  )
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
  );

DROP POLICY IF EXISTS sales_org_product_approvals_delete ON public.sales_organization_product_approvals;
CREATE POLICY sales_org_product_approvals_delete ON public.sales_organization_product_approvals
  FOR DELETE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
  );

-- ---------------------------------------------------------------------------
-- Clinical discovery answers + provider activities
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS provider_clinical_discovery_answers_select ON public.provider_clinical_discovery_answers;
CREATE POLICY provider_clinical_discovery_answers_select ON public.provider_clinical_discovery_answers
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
    OR EXISTS (
      SELECT 1
      FROM public.surgical_sales_contacts c
      WHERE c.id = provider_clinical_discovery_answers.provider_id
        AND c.account_id IN (
          SELECT m.account_id FROM public.account_users m
          WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
        )
    )
  );

DROP POLICY IF EXISTS provider_clinical_discovery_answers_insert ON public.provider_clinical_discovery_answers;
CREATE POLICY provider_clinical_discovery_answers_insert ON public.provider_clinical_discovery_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
    OR EXISTS (
      SELECT 1
      FROM public.surgical_sales_contacts c
      WHERE c.id = provider_clinical_discovery_answers.provider_id
        AND c.account_id IN (
          SELECT m.account_id FROM public.account_users m
          WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
        )
    )
  );

DROP POLICY IF EXISTS provider_clinical_discovery_answers_update ON public.provider_clinical_discovery_answers;
CREATE POLICY provider_clinical_discovery_answers_update ON public.provider_clinical_discovery_answers
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
    OR EXISTS (
      SELECT 1
      FROM public.surgical_sales_contacts c
      WHERE c.id = provider_clinical_discovery_answers.provider_id
        AND c.account_id IN (
          SELECT m.account_id FROM public.account_users m
          WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_provider_activities_select ON public.surgical_sales_provider_activities;
CREATE POLICY surgical_sales_provider_activities_select ON public.surgical_sales_provider_activities
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
  );

DROP POLICY IF EXISTS surgical_sales_provider_activities_insert ON public.surgical_sales_provider_activities;
CREATE POLICY surgical_sales_provider_activities_insert ON public.surgical_sales_provider_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR (
      (SELECT public.surgical_sales_is_internal_sales_rep())
      AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS surgical_sales_provider_activities_update ON public.surgical_sales_provider_activities;
CREATE POLICY surgical_sales_provider_activities_update ON public.surgical_sales_provider_activities
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR (SELECT public.surgical_sales_is_internal_sales_rep())
  );

COMMENT ON POLICY sales_opportunities_select ON public.sales_opportunities IS
  'Internal sales reps share opportunity visibility; owner_user_id remains attribution.';
