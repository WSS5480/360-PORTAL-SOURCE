-- Add share_mode to documents_folders: all | admin_only | selected
-- all = visible to all portal accounts
-- admin_only = not visible in portal
-- selected = visible to specific accounts (via account_id and documents_folder_accounts)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documents_share_mode') THEN
    CREATE TYPE documents_share_mode AS ENUM ('all', 'admin_only', 'selected');
  END IF;
END $$;

ALTER TABLE documents_folders
  ADD COLUMN IF NOT EXISTS share_mode documents_share_mode;

-- Migrate existing: account_id NULL -> admin_only, account_id set -> selected
UPDATE documents_folders
SET share_mode = CASE
  WHEN account_id IS NOT NULL THEN 'selected'::documents_share_mode
  ELSE 'admin_only'::documents_share_mode
END
WHERE share_mode IS NULL;

ALTER TABLE documents_folders
  ALTER COLUMN share_mode SET DEFAULT 'admin_only'::documents_share_mode;

COMMENT ON COLUMN documents_folders.share_mode IS 'all=visible to all accounts, admin_only=not in portal, selected=specific accounts';

-- Junction table for multi-account selection when share_mode='selected'
CREATE TABLE IF NOT EXISTS documents_folder_accounts (
  folder_id uuid NOT NULL REFERENCES documents_folders(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_folder_accounts_account_id
  ON documents_folder_accounts(account_id);

COMMENT ON TABLE documents_folder_accounts IS 'Accounts that can access folder when share_mode=selected. Also used when account_id is set for backward compat.';

-- Migrate: for folders with account_id, add to folder_accounts
INSERT INTO documents_folder_accounts (folder_id, account_id)
SELECT id, account_id FROM documents_folders
WHERE share_mode = 'selected' AND account_id IS NOT NULL
ON CONFLICT (folder_id, account_id) DO NOTHING;

-- Drop old portal RLS policies (they reference account_id only)
DROP POLICY IF EXISTS "Portal users can read documents_folders for their accounts" ON public.documents_folders;
DROP POLICY IF EXISTS "Portal users can read documents_files for their account folders" ON public.documents_files;

-- New portal policy: share_mode='all' OR (share_mode='selected' AND (account_id or folder_accounts))
CREATE POLICY "Portal users can read documents_folders"
  ON public.documents_folders FOR SELECT
  TO authenticated
  USING (
    share_mode = 'all'
    OR (
      share_mode = 'selected'
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
  );

CREATE POLICY "Portal users can read documents_files"
  ON public.documents_files FOR SELECT
  TO authenticated
  USING (
    folder_id IN (
      SELECT id FROM public.documents_folders
      WHERE share_mode = 'all'
        OR (
          share_mode = 'selected'
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

-- Admin policies for folder_accounts (admin manages, portal reads via folder RLS)
ALTER TABLE documents_folder_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or staff can read documents_folder_accounts"
  ON public.documents_folder_accounts FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

CREATE POLICY "Admin or staff can insert documents_folder_accounts"
  ON public.documents_folder_accounts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_admin_or_staff()));

CREATE POLICY "Admin or staff can delete documents_folder_accounts"
  ON public.documents_folder_accounts FOR DELETE
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));
