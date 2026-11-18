-- Migration: Enable RLS on all public tables & fix security definer view
-- This addresses Supabase security alerts: rls_disabled_in_public and security_definer_view
--
-- IMPORTANT: Your app uses supabaseAdmin (service role) for most DB access. The service role
-- bypasses RLS, so admin API routes will continue to work. This migration adds RLS to block
-- direct PostgREST access (anon/authenticated) from bypassing your app's auth checks.

-- =============================================================================
-- 1. Create helper for admin/staff detection (used in RLS policies)
-- Placed in a schema to avoid PostgREST exposure; use SECURITY DEFINER to read
-- internal_users and user_profiles without RLS blocking
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin_or_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.internal_users WHERE user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_staff = true
  );
END;
$$;

-- =============================================================================
-- 2. Enable RLS on all public tables
-- Tables with no policies = no access for anon/authenticated (service role bypasses)
-- =============================================================================
ALTER TABLE public.account_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_portal_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropship_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_item_trace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_coverage_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_insurance_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_phi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_order_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_identifiers ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. Policies for tables used by createSupabaseServerClient (portal + staff)
-- Portal: account-scoped via account_users. Staff: full access via is_admin_or_staff()
-- =============================================================================

-- internal_users: users can read their own row (needed for admin check)
CREATE POLICY "Users can read own internal_users row"
  ON public.internal_users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- user_profiles: users can read own + staff/admin can read all
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admin or staff can read all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- account_users: portal members see their memberships; staff see all
CREATE POLICY "Users can read own account memberships"
  ON public.account_users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admin or staff can read all account_users"
  ON public.account_users FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- accounts: portal sees their accounts; staff see all
CREATE POLICY "Portal users can read their accounts"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

CREATE POLICY "Admin or staff can read all accounts"
  ON public.accounts FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- account_contacts: portal sees their account's contacts; staff see all
CREATE POLICY "Portal users can read contacts for their accounts"
  ON public.account_contacts FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

CREATE POLICY "Admin or staff can read all account_contacts"
  ON public.account_contacts FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- account_addresses: portal sees their account's addresses; staff see all
CREATE POLICY "Portal users can read addresses for their accounts"
  ON public.account_addresses FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

CREATE POLICY "Admin or staff can read all account_addresses"
  ON public.account_addresses FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- ivr_requests: portal sees their account's IVRs; staff see all
CREATE POLICY "Portal users can read ivr_requests for their accounts"
  ON public.ivr_requests FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

CREATE POLICY "Admin or staff can read all ivr_requests"
  ON public.ivr_requests FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- orders: portal sees their account's orders; staff see all
CREATE POLICY "Portal users can read orders for their accounts"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

CREATE POLICY "Admin or staff can read all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- account_provider_profiles: portal sees their account's; staff see all
CREATE POLICY "Portal users can read provider_profiles for their accounts"
  ON public.account_provider_profiles FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

CREATE POLICY "Admin or staff can read all account_provider_profiles"
  ON public.account_provider_profiles FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- =============================================================================
-- 4. Fix security definer view: account_contacts_with_ivr_counts
-- Recreate with security_invoker so it respects RLS on underlying tables
-- =============================================================================
-- Note: We need the existing view definition. If the view has a different
-- structure, run this in Supabase SQL editor first to inspect:
--   SELECT pg_get_viewdef('public.account_contacts_with_ivr_counts'::regclass, true);

-- Drop and recreate with security_invoker (Postgres 15+)
-- If the view definition differs in your DB, adjust the SELECT below
DROP VIEW IF EXISTS public.account_contacts_with_ivr_counts;

CREATE VIEW public.account_contacts_with_ivr_counts
WITH (security_invoker = true)
AS
SELECT
  ac.id,
  ac.account_id,
  ac.full_name,
  ac.email,
  ac.created_at,
  ac.is_primary,
  COALESCE(ivr_cnt.cnt, 0)::integer AS ivr_count
FROM public.account_contacts ac
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS cnt
  FROM public.ivr_requests ivr
  WHERE ivr.contact_id = ac.id
) ivr_cnt ON true;
