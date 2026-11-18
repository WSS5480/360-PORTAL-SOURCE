-- Seed additional wound-care graft products/variants from Odoo catalog.
-- Safe to run multiple times: skips products/variants that already exist.

-- Products
INSERT INTO public.products (name, code, is_active, base_unit_price)
SELECT v.name, v.code, true, 0
FROM (VALUES
  ('EvoPatch Dual Layer Amnion', 'EVOPATCH'),
  ('Amnio Quad-Core', 'AMNIO_QUAD'),
  ('Membrane Wrap Amniotic Tissue', 'MEMBRANE_WRAP'),
  ('Membrane Wrap - Hydro Amniotic Tissue', 'MEMBRANE_WRAP_HYDRO'),
  ('Membrane Wrap - Lite Amniotic Tissue', 'MEMBRANE_WRAP_LITE'),
  ('Tri-Membrane Wrap Amniotic Tissue', 'TRI_MEMBRANE'),
  ('DL Amnio AMP-MP', 'AMP_MP')
) AS v(name, code)
WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.code = v.code);

-- Variants
INSERT INTO public.product_variants (product_id, sku, size_label, width_cm, length_cm, total_sqcm, is_active, base_unit_price)
SELECT p.id, v.sku, v.size_label, v.width_cm, v.length_cm, v.total_sqcm, true, 0
FROM public.products p
JOIN (VALUES
  ('EVOPATCH', 'EAP-46', '4x6cm EvoPatch Dual Layer Amnion', 4, 6, 24),
  ('EVOPATCH', 'EAP-48', '4x8cm EvoPatch Dual Layer Amnion', 4, 8, 32),
  ('AMNIO_QUAD', 'AMQ-5230', '2x3cm Amnio Quad-Core', 2, 3, 6),
  ('AMNIO_QUAD', 'AMQ-5240', '2x4cm Amnio Quad-Core', 2, 4, 8),
  ('AMNIO_QUAD', 'AMQ-5340', '3x4cm Amnio Quad-Core', 3, 4, 12),
  ('AMNIO_QUAD', 'AMQ-5440', '4x4cm Amnio Quad-Core', 4, 4, 16),
  ('AMNIO_QUAD', 'AMQ-5460', '4x6cm Amnio Quad-Core', 4, 6, 24),
  ('AMNIO_QUAD', 'AMQ-5480', '4x8cm Amnio Quad-Core', 4, 8, 32),
  ('AMNIO_QUAD', 'AMQ-5660', '6x6cm Amnio Quad-Core', 6, 6, 36),
  ('AMNIO_QUAD', 'AMQ-5690', '6x9cm Amnio Quad-Core', 6, 9, 54),
  ('MEMBRANE_WRAP', 'MW0203', '2x3cm Membrane Wrap Amniotic Tissue', 2, 3, 6),
  ('MEMBRANE_WRAP', 'MW0404', '4x4cm Membrane Wrap Amniotic Tissue', 4, 4, 16),
  ('MEMBRANE_WRAP', 'MW0406', '4x6cm Membrane Wrap Amniotic Tissue', 4, 6, 24),
  ('MEMBRANE_WRAP', 'MW0408', '4x8cm Membrane Wrap Amniotic Tissue', 4, 8, 32),
  ('MEMBRANE_WRAP', 'MW10', '10mm Diameter Membrane Wrap Amniotic Tissue', NULL, NULL, NULL),
  ('MEMBRANE_WRAP_HYDRO', 'HM0202', '2x2cm Membrane Wrap - Hydro Amniotic Tissue', 2, 2, 4),
  ('MEMBRANE_WRAP_HYDRO', 'HM0408', '4x8cm Membrane Wrap - Hydro Amniotic Tissue', 4, 8, 32),
  ('MEMBRANE_WRAP_LITE', 'ML0406', '4x6cm Membrane Wrap - Lite Amniotic Tissue', 4, 6, 24),
  ('MEMBRANE_WRAP_LITE', 'ML0608', '6x8cm Membrane Wrap - Lite Amniotic Tissue', 6, 8, 48),
  ('AMP_MP', 'CG1102', '2x2cm DL Amnio AMP-MP', 2, 2, 4),
  ('AMP_MP', 'CG1104', '4x4cm DL Amnio AMP-MP', 4, 4, 16),
  ('AMP_MP', 'CG1105', '4x6cm DL Amnio AMP-MP', 4, 6, 24),
  ('AMP_MP', 'CG1106', '4x8cm DL Amnio AMP-MP', 4, 8, 32),
  ('TRI_MEMBRANE', 'TM0101', '1x1cm Tri-Membrane Wrap Amniotic Tissue', 1, 1, 1),
  ('TRI_MEMBRANE', 'TM0202', '2x2cm Tri-Membrane Wrap Amniotic Tissue', 2, 2, 4),
  ('TRI_MEMBRANE', 'TM0406', '4x6cm Tri-Membrane Wrap Amniotic Tissue', 4, 6, 24),
  ('TRI_MEMBRANE', 'TM0408', '4x8cm Tri-Membrane Wrap Amniotic Tissue', 4, 8, 32)
) AS v(product_code, sku, size_label, width_cm, length_cm, total_sqcm)
  ON p.code = v.product_code
WHERE NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.sku = v.sku);
