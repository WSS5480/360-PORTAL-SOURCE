-- Seed default warehouse for inventory_locations and backfill existing lot rows
-- so existing stock shows under one named bin (admin UI + reporting).

INSERT INTO public.inventory_locations (name, sort_order)
SELECT '360 Medical Warehouse', 0
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventory_locations
  WHERE lower(trim(name)) = lower(trim('360 Medical Warehouse'))
);

-- Assign any unassigned / placeholder lots to the default warehouse.
UPDATE public.product_variant_lots
SET location = '360 Medical Warehouse'
WHERE location IS NULL
   OR length(trim(location)) = 0
   OR lower(trim(location)) = 'default';
