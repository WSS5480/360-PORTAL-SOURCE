-- Sales Command: internal sales rep flag, invite role, opportunities table + RLS
-- Run in Supabase SQL Editor or your migration runner.

-- Invite / account role enum (stored on invites; accept maps to ORDER_CREATOR on account_users)
ALTER TYPE public.account_user_role ADD VALUE IF NOT EXISTS 'INTERNAL_SALES_REP';

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_internal_sales_rep boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_profiles.is_internal_sales_rep IS
  'When true, user may access Sales Command at /portal/sales.';

CREATE TABLE IF NOT EXISTS public.sales_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  account_name text NOT NULL,
  physician_name text,
  product_line text NOT NULL DEFAULT 'General',
  value_cents bigint NOT NULL DEFAULT 0 CHECK (value_cents >= 0),
  stage text NOT NULL DEFAULT 'new_lead' CHECK (
    stage IN (
      'new_lead',
      'demo_scheduled',
      'trial_running',
      'contract_review',
      'closed_won',
      'closed_lost'
    )
  ),
  territory text,
  close_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_opportunities_owner ON public.sales_opportunities (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_stage ON public.sales_opportunities (stage);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_close_date ON public.sales_opportunities (close_date);

ALTER TABLE public.sales_opportunities ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_opportunities TO authenticated;
GRANT ALL ON public.sales_opportunities TO service_role;

DROP POLICY IF EXISTS sales_opportunities_select ON public.sales_opportunities;
CREATE POLICY sales_opportunities_select ON public.sales_opportunities
  FOR SELECT TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
    )
  );

DROP POLICY IF EXISTS sales_opportunities_insert ON public.sales_opportunities;
CREATE POLICY sales_opportunities_insert ON public.sales_opportunities
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      owner_user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal_sales_rep = true
      )
    )
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
    owner_user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
    )
  )
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
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
    owner_user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
    )
  );
