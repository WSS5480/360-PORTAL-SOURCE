-- Sales Command: advanced contact management model.
-- Keeps organizations as parent account object and migrates existing surgical contacts safely.

-- 1) Expand/normalize contacts table for all people types.
ALTER TABLE public.surgical_sales_contacts
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.accounts (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mobile_phone text,
  ADD COLUMN IF NOT EXISTS influence_level text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS relationship_strength text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS is_primary_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Safe backfill from existing columns (if present).
UPDATE public.surgical_sales_contacts
SET organization_id = account_id
WHERE organization_id IS NULL
  AND account_id IS NOT NULL;

UPDATE public.surgical_sales_contacts
SET created_by = created_by_user_id
WHERE created_by IS NULL
  AND created_by_user_id IS NOT NULL;

UPDATE public.surgical_sales_contacts
SET is_primary_contact = coalesce(is_primary, false)
WHERE is_primary_contact IS DISTINCT FROM coalesce(is_primary, false);

-- Default unknown/legacy role mappings before enum-style checks.
UPDATE public.surgical_sales_contacts
SET role_type = CASE
  WHEN role_type IS NULL OR btrim(role_type) = '' THEN 'other'
  WHEN role_type = 'or_staff' THEN 'nurse'
  WHEN role_type = 'administrator' THEN 'admin'
  WHEN role_type IN (
    'surgeon',
    'physician_assistant',
    'nurse',
    'scheduler',
    'office_manager',
    'gatekeeper',
    'billing',
    'purchasing',
    'admin',
    'assistant',
    'other'
  ) THEN role_type
  ELSE 'other'
END;

ALTER TABLE public.surgical_sales_contacts
  ALTER COLUMN role_type SET DEFAULT 'other';

UPDATE public.surgical_sales_contacts
SET influence_level = 'unknown'
WHERE influence_level IS NULL
   OR influence_level NOT IN ('decision_maker', 'influencer', 'gatekeeper', 'unknown');

UPDATE public.surgical_sales_contacts
SET relationship_strength = 'unknown'
WHERE relationship_strength IS NULL
   OR relationship_strength NOT IN ('strong', 'medium', 'weak', 'unknown');

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_role_type_check;

ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_role_type_check
  CHECK (
    role_type IN (
      'surgeon',
      'physician_assistant',
      'nurse',
      'scheduler',
      'office_manager',
      'gatekeeper',
      'billing',
      'purchasing',
      'admin',
      'assistant',
      'other'
    )
  );

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_influence_level_check;

ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_influence_level_check
  CHECK (influence_level IN ('decision_maker', 'influencer', 'gatekeeper', 'unknown'));

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_relationship_strength_check;

ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_relationship_strength_check
  CHECK (relationship_strength IN ('strong', 'medium', 'weak', 'unknown'));

COMMENT ON COLUMN public.surgical_sales_contacts.organization_id IS
  'Parent organization (accounts.id). Nullable for shared contacts not tied to one organization.';
COMMENT ON COLUMN public.surgical_sales_contacts.mobile_phone IS
  'Optional mobile phone for CRM outreach.';
COMMENT ON COLUMN public.surgical_sales_contacts.role_type IS
  'Contact role: surgeon, physician_assistant, nurse, scheduler, office_manager, gatekeeper, billing, purchasing, admin, assistant, other.';
COMMENT ON COLUMN public.surgical_sales_contacts.influence_level IS
  'Influence in buying process: decision_maker, influencer, gatekeeper, unknown.';
COMMENT ON COLUMN public.surgical_sales_contacts.relationship_strength IS
  'Rep relationship strength: strong, medium, weak, unknown.';
COMMENT ON COLUMN public.surgical_sales_contacts.is_primary_contact IS
  'Primary contact marker for CRM workflows.';
COMMENT ON COLUMN public.surgical_sales_contacts.created_by IS
  'Auth user who created the contact.';

-- Keep legacy columns synced for existing sales code paths.
CREATE OR REPLACE FUNCTION public.surgical_sales_contacts_sync_legacy_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.account_id IS NOT NULL THEN
    NEW.organization_id := NEW.account_id;
  ELSIF NEW.organization_id IS NOT NULL AND NEW.account_id IS DISTINCT FROM NEW.organization_id THEN
    NEW.account_id := NEW.organization_id;
  END IF;

  IF NEW.created_by IS NULL AND NEW.created_by_user_id IS NOT NULL THEN
    NEW.created_by := NEW.created_by_user_id;
  ELSIF NEW.created_by IS NOT NULL AND NEW.created_by_user_id IS DISTINCT FROM NEW.created_by THEN
    NEW.created_by_user_id := NEW.created_by;
  END IF;

  IF NEW.is_primary_contact IS DISTINCT FROM coalesce(NEW.is_primary, false) THEN
    NEW.is_primary := NEW.is_primary_contact;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS surgical_sales_contacts_sync_legacy_columns
  ON public.surgical_sales_contacts;

CREATE TRIGGER surgical_sales_contacts_sync_legacy_columns
  BEFORE INSERT OR UPDATE ON public.surgical_sales_contacts
  FOR EACH ROW
  EXECUTE PROCEDURE public.surgical_sales_contacts_sync_legacy_columns();

-- 2) Contact relationships table (supports doctor/support network modeling).
CREATE TABLE IF NOT EXISTS public.surgical_sales_contact_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_contact_id uuid NOT NULL REFERENCES public.surgical_sales_contacts (id) ON DELETE CASCADE,
  related_contact_id uuid NOT NULL REFERENCES public.surgical_sales_contacts (id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'other',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_contact_relationships_not_self
    CHECK (primary_contact_id <> related_contact_id),
  CONSTRAINT surgical_sales_contact_relationships_type_check
    CHECK (
      relationship_type IN (
        'office_manager',
        'scheduler',
        'assistant',
        'gatekeeper',
        'billing_contact',
        'purchasing_contact',
        'colleague',
        'reports_to',
        'works_with',
        'other'
      )
    )
);

COMMENT ON TABLE public.surgical_sales_contact_relationships IS
  'Links contacts to supporting contacts and professional relationships for sales command.';

COMMENT ON COLUMN public.surgical_sales_contact_relationships.relationship_type IS
  'Relationship type: office_manager, scheduler, assistant, gatekeeper, billing_contact, purchasing_contact, colleague, reports_to, works_with, other.';

-- Prevent duplicate relationships for same direction + type.
CREATE UNIQUE INDEX IF NOT EXISTS uq_surgical_sales_contact_relationships_pair_type
  ON public.surgical_sales_contact_relationships (primary_contact_id, related_contact_id, relationship_type);

-- 3) Required indexes.
CREATE INDEX IF NOT EXISTS idx_surgical_sales_contacts_organization_id
  ON public.surgical_sales_contacts (organization_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_contacts_role_type
  ON public.surgical_sales_contacts (role_type);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_contacts_email
  ON public.surgical_sales_contacts (email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surgical_sales_contact_relationships_primary_contact_id
  ON public.surgical_sales_contact_relationships (primary_contact_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_contact_relationships_related_contact_id
  ON public.surgical_sales_contact_relationships (related_contact_id);
