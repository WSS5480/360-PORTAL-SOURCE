-- Per-portal-user gate when account-level virtual warehouse is enabled (account admins manage on Account users page).
ALTER TABLE public.account_users
  ADD COLUMN IF NOT EXISTS virtual_warehouse_access boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.account_users.virtual_warehouse_access IS
  'When account_pricing.virtual_warehouse_enabled is true, this flag allows or denies this user''s access to VW portal features.';
