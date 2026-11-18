-- Fix organization_id FK: surgical CRM orgs live in sales_organizations, not ordering accounts.

ALTER TABLE public.universal_surgical_fact_captures
  DROP CONSTRAINT IF EXISTS universal_surgical_fact_captures_organization_id_fkey;

ALTER TABLE public.universal_surgical_fact_captures
  ADD CONSTRAINT universal_surgical_fact_captures_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.sales_organizations (id) ON DELETE SET NULL;

ALTER TABLE public.universal_surgical_facts
  DROP CONSTRAINT IF EXISTS universal_surgical_facts_organization_id_fkey;

ALTER TABLE public.universal_surgical_facts
  ADD CONSTRAINT universal_surgical_facts_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.sales_organizations (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.universal_surgical_fact_captures.organization_id IS
  'Sales Command organization (sales_organizations.id).';

COMMENT ON COLUMN public.universal_surgical_facts.organization_id IS
  'Sales Command organization (sales_organizations.id).';
