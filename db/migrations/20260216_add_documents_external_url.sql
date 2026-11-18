-- Add external_url to documents_files for YouTube videos and other links
ALTER TABLE documents_files
  ADD COLUMN IF NOT EXISTS external_url text;

-- Allow storage_path to be null when external_url is set (link-only entries)
ALTER TABLE documents_files
  ALTER COLUMN storage_path DROP NOT NULL;

COMMENT ON COLUMN documents_files.external_url IS 'When set, this is a link (e.g. YouTube video) instead of a stored file. Portal shows Watch/Open instead of Download.';
