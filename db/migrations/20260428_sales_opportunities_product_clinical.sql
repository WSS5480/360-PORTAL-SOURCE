-- Sales opportunities: link to catalog products + care setting (hospital / practice / mobile)

ALTER TABLE public.sales_opportunities
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products (id) ON DELETE SET NULL;

ALTER TABLE public.sales_opportunities
  ADD COLUMN IF NOT EXISTS practice_setting text NOT NULL DEFAULT 'private_practice';

ALTER TABLE public.sales_opportunities
  DROP CONSTRAINT IF EXISTS sales_opportunities_practice_setting_check;

ALTER TABLE public.sales_opportunities
  ADD CONSTRAINT sales_opportunities_practice_setting_check
  CHECK (practice_setting IN ('hospital', 'private_practice', 'mobile', 'other'));

COMMENT ON COLUMN public.sales_opportunities.product_id IS 'FK to products; product_line stores denormalized name for reporting.';
COMMENT ON COLUMN public.sales_opportunities.practice_setting IS 'Where the clinician practices: hospital, private_practice, mobile, or other.';

CREATE INDEX IF NOT EXISTS idx_sales_opportunities_product_id ON public.sales_opportunities (product_id);
