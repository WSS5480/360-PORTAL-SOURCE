-- Add parent_id to documents_folders for nested folder structure
-- e.g. Product Resources > UltraMist > brochures and videos
ALTER TABLE documents_folders
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES documents_folders(id) ON DELETE CASCADE;

-- Prevent self-reference
ALTER TABLE documents_folders
  ADD CONSTRAINT documents_folders_no_self_parent
  CHECK (parent_id IS NULL OR parent_id != id);

CREATE INDEX IF NOT EXISTS idx_documents_folders_parent_id
  ON documents_folders(parent_id);

COMMENT ON COLUMN documents_folders.parent_id IS 'Parent folder for nesting. NULL = root folder.';
