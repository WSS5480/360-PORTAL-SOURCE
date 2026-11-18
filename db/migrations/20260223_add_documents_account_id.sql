-- Add account_id to documents_folders for HIPAA-compliant account-scoped document access
-- Folders with account_id = NULL are admin-only (not visible in portal)
-- Portal users see only folders where account_id = their current account

ALTER TABLE documents_folders
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_folders_account_id
  ON documents_folders(account_id);

COMMENT ON COLUMN documents_folders.account_id IS 'Account that can access this folder in portal. NULL = admin-only, not visible in portal.';

-- RLS policies for documents (portal users see only their account's folders)
CREATE POLICY "Portal users can read documents_folders for their accounts"
  ON public.documents_folders FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
    )
  );

CREATE POLICY "Admin or staff can read all documents_folders"
  ON public.documents_folders FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

CREATE POLICY "Admin or staff can insert documents_folders"
  ON public.documents_folders FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_admin_or_staff()));

CREATE POLICY "Admin or staff can update documents_folders"
  ON public.documents_folders FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

CREATE POLICY "Admin or staff can delete documents_folders"
  ON public.documents_folders FOR DELETE
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

-- documents_files: access via folder's account_id
CREATE POLICY "Portal users can read documents_files for their account folders"
  ON public.documents_files FOR SELECT
  TO authenticated
  USING (
    folder_id IN (
      SELECT id FROM public.documents_folders
      WHERE account_id IN (
        SELECT account_id FROM public.account_users
        WHERE user_id = (SELECT auth.uid()) AND disabled_at IS NULL
      )
    )
  );

CREATE POLICY "Admin or staff can read all documents_files"
  ON public.documents_files FOR SELECT
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));

CREATE POLICY "Admin or staff can insert documents_files"
  ON public.documents_files FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_admin_or_staff()));

CREATE POLICY "Admin or staff can delete documents_files"
  ON public.documents_files FOR DELETE
  TO authenticated
  USING ((SELECT private.is_admin_or_staff()));
