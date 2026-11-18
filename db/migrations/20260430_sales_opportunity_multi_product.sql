-- Allow multiple catalog products per opportunity (primary product_id + extras).
ALTER TABLE public.sales_opportunities
  ADD COLUMN IF NOT EXISTS additional_product_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.sales_opportunities.additional_product_ids IS
  'Additional active products beyond product_id; product_line lists all names for reporting.';

CREATE INDEX IF NOT EXISTS idx_sales_opportunities_additional_product_ids
  ON public.sales_opportunities USING gin (additional_product_ids);
