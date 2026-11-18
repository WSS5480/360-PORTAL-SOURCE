-- Lightweight AI-approved contacts vs rep-verified CRM contacts.

ALTER TABLE public.surgical_sales_contacts
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'verified';

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_verification_status_check;

ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_verification_status_check
  CHECK (verification_status IN ('suggested', 'verified'));

COMMENT ON COLUMN public.surgical_sales_contacts.verification_status IS
  'suggested = rep-approved AI extraction pending verification; verified = confirmed CRM contact.';
