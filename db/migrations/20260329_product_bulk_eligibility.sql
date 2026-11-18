-- Bulk purchase catalog: which products/variants appear when an account uses bulk mode.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bulk_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS bulk_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.bulk_enabled IS 'When true, product may appear in bulk purchase flows; variant flags refine eligibility.';
COMMENT ON COLUMN public.product_variants.bulk_enabled IS 'When product.bulk_enabled, variant is offered for bulk if true.';
