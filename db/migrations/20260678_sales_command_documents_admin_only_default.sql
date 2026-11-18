-- Sales Command document folders: default closed (admin only), lock existing library.

UPDATE public.sales_command_document_folders
SET access_level = 'admin_only',
    updated_at = now()
WHERE access_level IS DISTINCT FROM 'admin_only';

ALTER TABLE public.sales_command_document_folders
  ALTER COLUMN access_level SET DEFAULT 'admin_only';
