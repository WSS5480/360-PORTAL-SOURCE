-- Supabase database linter: auth_rls_initplan, multiple_permissive_policies, duplicate_index
-- See: https://supabase.com/docs/guides/database/database-linter
--
-- 1) Wrap auth.uid() as (select auth.uid()) inside SECURITY DEFINER helper (initplan).
-- 2) Merge multiple permissive SELECT policies per table into one USING (...) OR (...) policy.
-- 3) Drop redundant duplicate indexes (keep PK / primary unique constraint names).
-- 4) Section I: account_invites.archived_at for /admin/invites (run in SQL Editor if no separate migration tool).

-- =============================================================================
-- A) Initplan-safe admin/staff helper (avoids per-row auth.uid() re-eval in callers)
-- =============================================================================
CREATE OR REPLACE FUNCTION private.is_admin_or_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.internal_users WHERE user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = (SELECT auth.uid()) AND is_staff = true
  );
END;
$$;

-- =============================================================================
-- B) user_profiles: single SELECT + explicit insert/update (drop legacy duplicate names)
-- =============================================================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin or staff can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_authenticated" ON public.user_profiles;

CREATE POLICY "user_profiles_select_authenticated"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_authenticated" ON public.user_profiles;

CREATE POLICY "user_profiles_insert_authenticated"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_authenticated" ON public.user_profiles;

CREATE POLICY "user_profiles_update_authenticated"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- C) internal_users (initplan pattern already OK; normalize to subselect style)
-- =============================================================================
DROP POLICY IF EXISTS "Users can read own internal_users row" ON public.internal_users;
DROP POLICY IF EXISTS "internal_users_select_own" ON public.internal_users;

CREATE POLICY "internal_users_select_own"
  ON public.internal_users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =============================================================================
-- D) Merge permissive SELECT: account_users, accounts, contacts, addresses, provider_profiles, ivr
-- =============================================================================
DROP POLICY IF EXISTS "Users can read own account memberships" ON public.account_users;
DROP POLICY IF EXISTS "Admin or staff can read all account_users" ON public.account_users;
DROP POLICY IF EXISTS "account_users_select_authenticated" ON public.account_users;

CREATE POLICY "account_users_select_authenticated"
  ON public.account_users FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Portal users can read their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admin or staff can read all accounts" ON public.accounts;
DROP POLICY IF EXISTS "accounts_select_authenticated" ON public.accounts;

CREATE POLICY "accounts_select_authenticated"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Portal users can read contacts for their accounts" ON public.account_contacts;
DROP POLICY IF EXISTS "Admin or staff can read all account_contacts" ON public.account_contacts;
DROP POLICY IF EXISTS "account_contacts_select_authenticated" ON public.account_contacts;

CREATE POLICY "account_contacts_select_authenticated"
  ON public.account_contacts FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Portal users can read addresses for their accounts" ON public.account_addresses;
DROP POLICY IF EXISTS "Admin or staff can read all account_addresses" ON public.account_addresses;
DROP POLICY IF EXISTS "account_addresses_select_authenticated" ON public.account_addresses;

CREATE POLICY "account_addresses_select_authenticated"
  ON public.account_addresses FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Portal users can read provider_profiles for their accounts" ON public.account_provider_profiles;
DROP POLICY IF EXISTS "Admin or staff can read all account_provider_profiles" ON public.account_provider_profiles;
DROP POLICY IF EXISTS "account_provider_profiles_select_authenticated" ON public.account_provider_profiles;

CREATE POLICY "account_provider_profiles_select_authenticated"
  ON public.account_provider_profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Portal users can read ivr_requests for their accounts" ON public.ivr_requests;
DROP POLICY IF EXISTS "Admin or staff can read all ivr_requests" ON public.ivr_requests;
DROP POLICY IF EXISTS "ivr_requests_select_authenticated" ON public.ivr_requests;

CREATE POLICY "ivr_requests_select_authenticated"
  ON public.ivr_requests FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

-- =============================================================================
-- E) orders + related (merge SELECT; replace initplan-named policies)
-- =============================================================================
DROP POLICY IF EXISTS "Portal users can read orders for their accounts" ON public.orders;
DROP POLICY IF EXISTS "Admin or staff can read all orders" ON public.orders;
DROP POLICY IF EXISTS orders_read_by_member ON public.orders;
DROP POLICY IF EXISTS "orders_select_authenticated" ON public.orders;

CREATE POLICY "orders_select_authenticated"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

DROP POLICY IF EXISTS orders_create_by_creator ON public.orders;
DROP POLICY IF EXISTS "orders_insert_authenticated" ON public.orders;

CREATE POLICY "orders_insert_authenticated"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

DROP POLICY IF EXISTS order_items_read_by_member ON public.order_items;
DROP POLICY IF EXISTS order_items_insert_by_creator ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_authenticated" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_authenticated" ON public.order_items;

CREATE POLICY "order_items_select_authenticated"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.account_id IN (
          SELECT account_id FROM public.account_users
          WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
        )
    )
  );

CREATE POLICY "order_items_insert_authenticated"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_admin_or_staff())
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.account_id IN (
          SELECT account_id FROM public.account_users
          WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
        )
    )
  );

DROP POLICY IF EXISTS order_status_events_read_by_member ON public.order_status_events;
DROP POLICY IF EXISTS "order_status_events_select_authenticated" ON public.order_status_events;

CREATE POLICY "order_status_events_select_authenticated"
  ON public.order_status_events FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_events.order_id
        AND o.account_id IN (
          SELECT account_id FROM public.account_users
          WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
        )
    )
  );

-- =============================================================================
-- F) account_pricing (RLS may exist only in prod; enable + single read policy)
-- =============================================================================
ALTER TABLE public.account_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_pricing_read_by_member ON public.account_pricing;
DROP POLICY IF EXISTS "account_pricing_select_authenticated" ON public.account_pricing;

CREATE POLICY "account_pricing_select_authenticated"
  ON public.account_pricing FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

-- =============================================================================
-- G) documents: merge portal + admin SELECT (supports share_mode from 20260224)
-- =============================================================================
DROP POLICY IF EXISTS "Portal users can read documents_folders for their accounts" ON public.documents_folders;
DROP POLICY IF EXISTS "Portal users can read documents_folders" ON public.documents_folders;
DROP POLICY IF EXISTS "Admin or staff can read all documents_folders" ON public.documents_folders;
DROP POLICY IF EXISTS "documents_folders_select_authenticated" ON public.documents_folders;

CREATE POLICY "documents_folders_select_authenticated"
  ON public.documents_folders FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR (
      share_mode = 'all'::documents_share_mode
      OR (
        share_mode = 'selected'::documents_share_mode
        AND (
          account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
          )
          OR id IN (
            SELECT folder_id FROM public.documents_folder_accounts
            WHERE account_id IN (
              SELECT account_id FROM public.account_users
              WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Portal users can read documents_files for their account folders" ON public.documents_files;
DROP POLICY IF EXISTS "Portal users can read documents_files" ON public.documents_files;
DROP POLICY IF EXISTS "Admin or staff can read all documents_files" ON public.documents_files;
DROP POLICY IF EXISTS "documents_files_select_authenticated" ON public.documents_files;

CREATE POLICY "documents_files_select_authenticated"
  ON public.documents_files FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR folder_id IN (
      SELECT id FROM public.documents_folders
      WHERE share_mode = 'all'::documents_share_mode
        OR (
          share_mode = 'selected'::documents_share_mode
          AND (
            account_id IN (
              SELECT account_id FROM public.account_users
              WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
            )
            OR id IN (
              SELECT folder_id FROM public.documents_folder_accounts
              WHERE account_id IN (
                SELECT account_id FROM public.account_users
                WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
              )
            )
          )
        )
    )
  );

-- documents_folder_accounts: enable RLS (linter 0013; table from 20260313 often had no RLS)
ALTER TABLE public.documents_folder_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin or staff can read documents_folder_accounts" ON public.documents_folder_accounts;
DROP POLICY IF EXISTS "Admin or staff can insert documents_folder_accounts" ON public.documents_folder_accounts;
DROP POLICY IF EXISTS "Admin or staff can delete documents_folder_accounts" ON public.documents_folder_accounts;
DROP POLICY IF EXISTS "documents_folder_accounts_select_authenticated" ON public.documents_folder_accounts;
DROP POLICY IF EXISTS "documents_folder_accounts_insert_authenticated" ON public.documents_folder_accounts;
DROP POLICY IF EXISTS "documents_folder_accounts_delete_authenticated" ON public.documents_folder_accounts;

CREATE POLICY "documents_folder_accounts_select_authenticated"
  ON public.documents_folder_accounts FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_admin_or_staff())
    OR account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

CREATE POLICY "documents_folder_accounts_insert_authenticated"
  ON public.documents_folder_accounts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_admin_or_staff()));

CREATE POLICY "documents_folder_accounts_delete_authenticated"
  ON public.documents_folder_accounts FOR DELETE
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- =============================================================================
-- H) Duplicate indexes (keep canonical constraint / one index per definition)
-- =============================================================================
DROP INDEX IF EXISTS public.idx_account_invites_token;

-- Redundant UNIQUE vs PK on account_users (same columns): drop duplicate constraint only, never the PK.
ALTER TABLE public.account_users DROP CONSTRAINT IF EXISTS account_users_unique;

DROP INDEX IF EXISTS public.fulfillment_item_trace_serial_number_idx;

DROP INDEX IF EXISTS public.fulfillments_one_open_per_order_source_open_idx;

-- =============================================================================
-- I) account_invites.archived_at (admin /admin/invites archive; no revoke)
-- =============================================================================
ALTER TABLE public.account_invites
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

COMMENT ON COLUMN public.account_invites.archived_at IS
  'Set when staff archives the row from /admin/invites; excluded from default lists.';

CREATE INDEX IF NOT EXISTS idx_account_invites_archived_at_null
  ON public.account_invites (created_at DESC)
  WHERE archived_at IS NULL;
