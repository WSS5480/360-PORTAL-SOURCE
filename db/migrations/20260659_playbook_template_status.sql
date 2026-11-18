-- Playbook lifecycle for admin management (active / inactive / archived).

ALTER TABLE public.sales_pre_call_plan_templates
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.sales_pre_call_plan_templates
  DROP CONSTRAINT IF EXISTS sales_pre_call_plan_templates_status_check;

ALTER TABLE public.sales_pre_call_plan_templates
  ADD CONSTRAINT sales_pre_call_plan_templates_status_check CHECK (
    status IN ('active', 'inactive', 'archived')
  );

CREATE INDEX IF NOT EXISTS idx_sales_pre_call_plan_templates_status
  ON public.sales_pre_call_plan_templates (status);

COMMENT ON COLUMN public.sales_pre_call_plan_templates.status IS
  'Playbook lifecycle: active (visible to reps), inactive (hidden), archived (retained, hidden).';

-- Admins may update system (company) playbooks including status and content.
DROP POLICY IF EXISTS sales_pre_call_plan_templates_update_system_admin ON public.sales_pre_call_plan_templates;
CREATE POLICY sales_pre_call_plan_templates_update_system_admin ON public.sales_pre_call_plan_templates
  FOR UPDATE TO authenticated
  USING (
    is_system = true
    AND (
      (SELECT public.surgical_sales_is_internal_portal_admin())
      OR (SELECT private.is_admin_or_staff())
    )
  )
  WITH CHECK (is_system = true);
