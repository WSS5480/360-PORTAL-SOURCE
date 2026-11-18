-- Sales Command document library (admin setup + rep portal).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_command_document_access') THEN
    CREATE TYPE public.sales_command_document_access AS ENUM (
      'all_reps',
      'territory_managers',
      'admin_only'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sales_command_document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NULL REFERENCES public.sales_command_document_folders (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  access_level public.sales_command_document_access NOT NULL DEFAULT 'all_reps',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_command_document_folders_name_chk CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_command_document_folders_parent
  ON public.sales_command_document_folders (parent_id, sort_order);

CREATE TABLE IF NOT EXISTS public.sales_command_document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.sales_command_document_folders (id) ON DELETE CASCADE,
  title text NOT NULL,
  filename text NULL,
  storage_bucket text NOT NULL DEFAULT 'documents-private',
  storage_path text NULL,
  content_type text NULL,
  size_bytes bigint NULL,
  external_url text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_command_document_files_title_chk CHECK (char_length(trim(title)) > 0),
  CONSTRAINT sales_command_document_files_source_chk CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_sales_command_document_files_folder
  ON public.sales_command_document_files (folder_id, sort_order, created_at DESC);

COMMENT ON TABLE public.sales_command_document_folders IS
  'Folder tree for Sales Command resource library (setup + rep portal).';
COMMENT ON COLUMN public.sales_command_document_folders.access_level IS
  'all_reps=every sales rep; territory_managers=managers only; admin_only=hidden from reps.';

ALTER TABLE public.sales_command_document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_command_document_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_command_document_folders_rep_select ON public.sales_command_document_folders;
CREATE POLICY sales_command_document_folders_rep_select
  ON public.sales_command_document_folders FOR SELECT
  TO authenticated
  USING (
    access_level = 'all_reps'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal_sales_rep = true
    )
    OR access_level = 'territory_managers'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_territory_manager = true
    )
  );

DROP POLICY IF EXISTS sales_command_document_files_rep_select ON public.sales_command_document_files;
CREATE POLICY sales_command_document_files_rep_select
  ON public.sales_command_document_files FOR SELECT
  TO authenticated
  USING (
    folder_id IN (
      SELECT f.id FROM public.sales_command_document_folders f
      WHERE (
        f.access_level = 'all_reps'
        AND EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal_sales_rep = true
        )
      )
      OR (
        f.access_level = 'territory_managers'
        AND EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_territory_manager = true
        )
      )
    )
  );
