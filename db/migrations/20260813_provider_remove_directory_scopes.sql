-- Hide a clinician from the Providers directory while leaving them on Contacts.
ALTER TABLE public.surgical_sales_contacts
  ADD COLUMN IF NOT EXISTS hidden_from_provider_directory_at timestamptz NULL;

COMMENT ON COLUMN public.surgical_sales_contacts.hidden_from_provider_directory_at IS
  'When set, the person is hidden from Providers lists but still appears in Contacts until archived_at is set.';

CREATE INDEX IF NOT EXISTS idx_surgical_sales_contacts_hidden_from_provider_directory
  ON public.surgical_sales_contacts (hidden_from_provider_directory_at)
  WHERE hidden_from_provider_directory_at IS NOT NULL;

UPDATE public.surgical_sales_contacts
SET hidden_from_provider_directory_at = archived_at
WHERE archived_at IS NOT NULL
  AND hidden_from_provider_directory_at IS NULL;
