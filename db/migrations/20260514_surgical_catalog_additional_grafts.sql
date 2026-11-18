-- Add additional graft product families for Sales Command opportunity planning.
-- No SKU variants are added for these at this time.

INSERT INTO public.surgical_sales_products (name, category, description, active)
SELECT v.name, 'graft', v.description, true
FROM (
  VALUES
    ('DermaCyte Matrix', 'Surgical graft family (no catalog variants yet)'),
    ('Amchoplast', 'Surgical graft family (no catalog variants yet)'),
    ('UltraMist', 'Surgical graft family (no catalog variants yet)')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.surgical_sales_products p
  WHERE lower(trim(p.name)) = lower(trim(v.name))
);
