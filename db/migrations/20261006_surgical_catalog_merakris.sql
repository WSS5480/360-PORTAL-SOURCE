-- Add Merakris as a sales-rep surgical product family.
-- Idempotent by name / SKU.

INSERT INTO public.surgical_sales_products (name, category, description, active)
SELECT v.name, 'family', v.description, true
FROM (
  VALUES
    ('Merakris', 'Merakris wound and skin-substitute product line')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.surgical_sales_products p
  WHERE lower(trim(p.name)) = lower(trim(v.name))
);

INSERT INTO public.surgical_sales_product_skus (product_id, sku, description, unit_of_measure, active)
SELECT p.id, v.sku, v.description, 'ea', true
FROM public.surgical_sales_products p
JOIN (
  VALUES
    ('Merakris', 'PLACEHOLDER-MERAKRIS', 'Placeholder SKU — replace when catalog is finalized')
) AS v(family, sku, description)
  ON lower(trim(p.name)) = lower(trim(v.family))
WHERE NOT EXISTS (SELECT 1 FROM public.surgical_sales_product_skus s WHERE s.sku = v.sku);
