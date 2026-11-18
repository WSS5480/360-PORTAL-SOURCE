-- If 20260401 was applied with DEFAULT true, align server default with product behavior (non-admins off).
ALTER TABLE public.account_users
  ALTER COLUMN virtual_warehouse_access SET DEFAULT false;
