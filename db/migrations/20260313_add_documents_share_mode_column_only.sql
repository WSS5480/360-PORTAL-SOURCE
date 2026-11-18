-- Minimal migration: add share_mode + documents_folder_accounts (for DBs that skipped 20260224)
-- Run this if you get: column documents_folders.share_mode does not exist
--
-- From project root, run against your Supabase DB:
--   psql "YOUR_DATABASE_URL" -f db/migrations/20260313_add_documents_share_mode_column_only.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documents_share_mode') THEN
    CREATE TYPE documents_share_mode AS ENUM ('all', 'admin_only', 'selected');
  END IF;
END $$;

ALTER TABLE documents_folders
  ADD COLUMN IF NOT EXISTS share_mode documents_share_mode;

UPDATE documents_folders
SET share_mode = CASE
  WHEN account_id IS NOT NULL THEN 'selected'::documents_share_mode
  ELSE 'admin_only'::documents_share_mode
END
WHERE share_mode IS NULL;

ALTER TABLE documents_folders
  ALTER COLUMN share_mode SET DEFAULT 'admin_only'::documents_share_mode;

-- Junction table for share_mode='selected' (create if missing)
CREATE TABLE IF NOT EXISTS documents_folder_accounts (
  folder_id uuid NOT NULL REFERENCES documents_folders(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_folder_accounts_account_id
  ON documents_folder_accounts(account_id);
