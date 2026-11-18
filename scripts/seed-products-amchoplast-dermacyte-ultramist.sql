-- Seed products with their variants: AmchoPlast, Dermacyte AC, ultraMIST
-- (Dermacyte Matrix / DERMACYTE is discontinued — kept inactive if present.)
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Safe to run multiple times: skips products/variants that already exist.

-- 1) Create products (if not exist)
INSERT INTO public.products (name, code, is_active, base_unit_price)
SELECT 'AmchoPlast', 'AMCHOPLAST', true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE code = 'AMCHOPLAST');

INSERT INTO public.products (name, code, is_active, base_unit_price)
SELECT 'Dermacyte AC', 'DERMACYTE_AC', true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE code = 'DERMACYTE_AC');

-- Legacy Matrix product: ensure inactive if it already exists
UPDATE public.products
SET is_active = false, updated_at = now()
WHERE code = 'DERMACYTE' AND is_active IS DISTINCT FROM false;

INSERT INTO public.products (name, code, is_active, base_unit_price)
SELECT 'ultraMIST', 'ULTRAMIST', true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE code = 'ULTRAMIST');

-- 2) Insert variants (skip if SKU already exists)
-- Columns: sku, size_label, width_cm, length_cm, total_sqcm (width × length)
-- AmchoPlast variants
INSERT INTO public.product_variants (product_id, sku, size_label, width_cm, length_cm, total_sqcm, is_active, base_unit_price)
SELECT p.id, v.sku, v.size_label, v.width_cm, v.length_cm, v.total_sqcm, true, 0
FROM public.products p
CROSS JOIN (VALUES
  ('ACM0202', '2x2cm AmchoPlast', 2, 2, 4),
  ('ACM0203', '2x3cm AmchoPlast', 2, 3, 6),
  ('ACM0303', '3x3cm AmchoPlast', 3, 3, 9),
  ('ACM0404', '4x4cm AmchoPlast', 4, 4, 16),
  ('ACM0406', '4x6cm AmchoPlast', 4, 6, 24),
  ('ACM0408', '4x8cm AmchoPlast', 4, 8, 32),
  ('ACM0608', '6x8cm AmchoPlast', 6, 8, 48),
  ('ACM1010', '10x10cm AmchoPlast', 10, 10, 100),
  ('ACM1020', '10x20cm AmchoPlast', 10, 20, 200)
) AS v(sku, size_label, width_cm, length_cm, total_sqcm)
WHERE p.code = 'AMCHOPLAST'
  AND NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.sku = v.sku);

-- AmchoPlast disc size (present in Odoo; may already exist in live DB)
INSERT INTO public.product_variants (product_id, sku, size_label, width_cm, length_cm, total_sqcm, is_active, base_unit_price)
SELECT p.id, 'ACM0014', '14mm Disc AmchoPlast', NULL, NULL, NULL, true, 0
FROM public.products p
WHERE p.code = 'AMCHOPLAST'
  AND NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.sku = 'ACM0014');

-- Dermacyte AC variants
INSERT INTO public.product_variants (product_id, sku, size_label, width_cm, length_cm, total_sqcm, is_active, base_unit_price)
SELECT p.id, v.sku, v.size_label, v.width_cm, v.length_cm, v.total_sqcm, true, 0
FROM public.products p
CROSS JOIN (VALUES
  ('AC-L10023', '2x3cm Dermacyte AC Matrix', 2, 3, 6),
  ('AC-L10033', '3x3cm Dermacyte AC Matrix', 3, 3, 9)
) AS v(sku, size_label, width_cm, length_cm, total_sqcm)
WHERE p.code = 'DERMACYTE_AC'
  AND NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.sku = v.sku);

-- Legacy Dermacyte Matrix variants: keep rows but mark inactive
UPDATE public.product_variants pv
SET is_active = false, updated_at = now()
FROM public.products p
WHERE pv.product_id = p.id
  AND p.code = 'DERMACYTE'
  AND pv.is_active IS DISTINCT FROM false;

-- ultraMIST variants (non-dimensional: equipment/accessories, no width/length/sqcm)
INSERT INTO public.product_variants (product_id, sku, size_label, width_cm, length_cm, total_sqcm, is_active, base_unit_price)
SELECT p.id, v.sku, v.size_label, NULL, NULL, NULL, true, 0
FROM public.products p
CROSS JOIN (VALUES
  ('CP-80030', 'ultraMIST System'),
  ('CP-80037', 'ultraMIST Cart Adapter'),
  ('CP-80038', 'ultraMIST Roll Stand'),
  ('CP-80040', 'ultraMIST Applicator Heads (bx of 12)')
) AS v(sku, size_label)
WHERE p.code = 'ULTRAMIST'
  AND NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.sku = v.sku);
