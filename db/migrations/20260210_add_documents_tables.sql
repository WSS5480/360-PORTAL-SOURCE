CREATE TABLE IF NOT EXISTS documents_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES documents_folders(id) ON DELETE CASCADE,
  title text,
  filename text,
  storage_bucket text NOT NULL DEFAULT 'documents-private',
  storage_path text NOT NULL,
  content_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_folders_sort_order
  ON documents_folders(sort_order);

CREATE INDEX IF NOT EXISTS idx_documents_files_folder_id
  ON documents_files(folder_id);

CREATE INDEX IF NOT EXISTS idx_documents_files_created_at
  ON documents_files(created_at);
