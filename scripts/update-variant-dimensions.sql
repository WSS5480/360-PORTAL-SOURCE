-- Update existing product variants with width_cm, length_cm, total_sqcm, size_label
-- Run this if variants already exist (e.g. from IMPORTED product) and need dimensions.
-- Run in Supabase SQL Editor.

-- AmchoPlast
UPDATE public.product_variants SET size_label = '2x2cm AmchoPlast', width_cm = 2, length_cm = 2, total_sqcm = 4, updated_at = now() WHERE sku = 'ACM0202';
UPDATE public.product_variants SET size_label = '2x3cm AmchoPlast', width_cm = 2, length_cm = 3, total_sqcm = 6, updated_at = now() WHERE sku = 'ACM0203';
UPDATE public.product_variants SET size_label = '3x3cm AmchoPlast', width_cm = 3, length_cm = 3, total_sqcm = 9, updated_at = now() WHERE sku = 'ACM0303';
UPDATE public.product_variants SET size_label = '4x4cm AmchoPlast', width_cm = 4, length_cm = 4, total_sqcm = 16, updated_at = now() WHERE sku = 'ACM0404';
UPDATE public.product_variants SET size_label = '4x6cm AmchoPlast', width_cm = 4, length_cm = 6, total_sqcm = 24, updated_at = now() WHERE sku = 'ACM0406';
UPDATE public.product_variants SET size_label = '4x8cm AmchoPlast', width_cm = 4, length_cm = 8, total_sqcm = 32, updated_at = now() WHERE sku = 'ACM0408';
UPDATE public.product_variants SET size_label = '6x8cm AmchoPlast', width_cm = 6, length_cm = 8, total_sqcm = 48, updated_at = now() WHERE sku = 'ACM0608';
UPDATE public.product_variants SET size_label = '10x10cm AmchoPlast', width_cm = 10, length_cm = 10, total_sqcm = 100, updated_at = now() WHERE sku = 'ACM1010';
UPDATE public.product_variants SET size_label = '10x20cm AmchoPlast', width_cm = 10, length_cm = 20, total_sqcm = 200, updated_at = now() WHERE sku = 'ACM1020';

-- Dermacyte Matrix
UPDATE public.product_variants SET size_label = '1x2cm Dermacyte Matrix', width_cm = 1, length_cm = 2, total_sqcm = 2, updated_at = now() WHERE sku = 'AM-D10012';
UPDATE public.product_variants SET size_label = '2x2cm Dermacyte Matrix', width_cm = 2, length_cm = 2, total_sqcm = 4, updated_at = now() WHERE sku = 'AM-D10022';
UPDATE public.product_variants SET size_label = '2x4cm Dermacyte Matrix', width_cm = 2, length_cm = 4, total_sqcm = 8, updated_at = now() WHERE sku = 'AM-D10024';
UPDATE public.product_variants SET size_label = '4x4cm Dermacyte Matrix', width_cm = 4, length_cm = 4, total_sqcm = 16, updated_at = now() WHERE sku = 'AM-D10044';
UPDATE public.product_variants SET size_label = '4x6cm Dermacyte Matrix', width_cm = 4, length_cm = 6, total_sqcm = 24, updated_at = now() WHERE sku = 'AM-D10046';
UPDATE public.product_variants SET size_label = '4x8cm Dermacyte Matrix', width_cm = 4, length_cm = 8, total_sqcm = 32, updated_at = now() WHERE sku = 'AM-D10048';

-- ultraMIST (size_label only; dimensions stay NULL)
UPDATE public.product_variants SET size_label = 'ultraMIST System', updated_at = now() WHERE sku = 'CP-80030';
UPDATE public.product_variants SET size_label = 'ultraMIST Cart Adapter', updated_at = now() WHERE sku = 'CP-80037';
UPDATE public.product_variants SET size_label = 'ultraMIST Roll Stand', updated_at = now() WHERE sku = 'CP-80038';
UPDATE public.product_variants SET size_label = 'ultraMIST Applicator Heads (bx of 12)', updated_at = now() WHERE sku = 'CP-80040';
