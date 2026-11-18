-- Placeholder SKUs for product families without catalog rows yet (enables case creation end-to-end).
-- `sku` is globally unique (`surgical_sales_product_skus_sku_unique`), so each family gets its own code.

-- Clean up failed partial run that used a single shared sku value.
DELETE FROM public.surgical_sales_product_skus WHERE sku = 'PLACEHOLDER';

INSERT INTO public.surgical_sales_product_skus (product_id, sku, description, unit_of_measure, active)
SELECT p.id, v.sku, v.description, 'ea', true
FROM public.surgical_sales_products p
JOIN (
  VALUES
    ('Skeletal Dynamics', 'PLACEHOLDER-SKELETAL-DYNAMICS', 'Placeholder SKU — replace when catalog is finalized'),
    ('BioTissue', 'PLACEHOLDER-BIOTISSUE', 'Placeholder SKU — replace when catalog is finalized'),
    ('TelaBio', 'PLACEHOLDER-TELABIO', 'Placeholder SKU — replace when catalog is finalized')
) AS v(family, sku, description)
  ON lower(trim(p.name)) = lower(trim(v.family))
WHERE NOT EXISTS (SELECT 1 FROM public.surgical_sales_product_skus s WHERE s.sku = v.sku);
