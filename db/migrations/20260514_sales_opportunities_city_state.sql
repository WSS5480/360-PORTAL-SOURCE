-- Sales Command opportunities: replace broad territory with city/state location.

ALTER TABLE public.sales_opportunities
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

COMMENT ON COLUMN public.sales_opportunities.city IS
  'Opportunity location city (sales workflow).';

COMMENT ON COLUMN public.sales_opportunities.state IS
  'Opportunity location state/province (sales workflow).';
