-- Sales intelligence / workflow fields for surgical CRM contacts (no PHI).

ALTER TABLE public.surgical_sales_contacts
  ADD COLUMN IF NOT EXISTS preferred_contact_method text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS best_time_to_contact text,
  ADD COLUMN IF NOT EXISTS access_notes text,
  ADD COLUMN IF NOT EXISTS personality_notes text,
  ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_preferred_contact_method_check;

ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_preferred_contact_method_check
    CHECK (
      preferred_contact_method IN (
        'email',
        'phone',
        'text',
        'in_person',
        'unknown'
      )
    );

COMMENT ON COLUMN public.surgical_sales_contacts.preferred_contact_method IS 'How this contact prefers to be reached.';
COMMENT ON COLUMN public.surgical_sales_contacts.best_time_to_contact IS 'Free-text window for outreach (e.g. mornings, after 2pm).';
COMMENT ON COLUMN public.surgical_sales_contacts.access_notes IS 'How to get through / gatekeeping notes. Do not store PHI.';
COMMENT ON COLUMN public.surgical_sales_contacts.personality_notes IS 'Relationship / style notes. Do not store PHI.';
COMMENT ON COLUMN public.surgical_sales_contacts.do_not_contact IS 'When true, reps should not proactively reach out.';
COMMENT ON COLUMN public.surgical_sales_contacts.last_contacted_at IS 'Last outreach timestamp (rep-maintained).';
COMMENT ON COLUMN public.surgical_sales_contacts.next_follow_up_at IS 'Next follow-up reminder time (rep-maintained).';
