-- Add BioTissue and TelaBio production variants for Sales Command surgical catalog.
-- Idempotent by globally-unique SKU code.

INSERT INTO public.surgical_sales_product_skus (product_id, sku, description, unit_of_measure, active)
SELECT p.id, v.sku, v.description, v.uom, true
FROM public.surgical_sales_products p
JOIN (
  VALUES
    -- BioTissue: Neox RT (hydrated room-temp ultra-thick amniotic membrane allograft)
    ('BioTissue', 'NX-UR-2010', 'Neox RT - Hydrated, Room Temperature Ultra-Thick Amniotic Membrane Allograft · 2.0 x 1.0 cm', 'ea'),
    ('BioTissue', 'NX-UR-2020', 'Neox RT - Hydrated, Room Temperature Ultra-Thick Amniotic Membrane Allograft · 2.0 x 2.0 cm', 'ea'),
    ('BioTissue', 'NX-UR-3020', 'Neox RT - Hydrated, Room Temperature Ultra-Thick Amniotic Membrane Allograft · 3.0 x 2.0 cm', 'ea'),
    ('BioTissue', 'NX-UR-3030', 'Neox RT - Hydrated, Room Temperature Ultra-Thick Amniotic Membrane Allograft · 3.0 x 3.0 cm', 'ea'),
    ('BioTissue', 'NX-UR-4030', 'Neox RT - Hydrated, Room Temperature Ultra-Thick Amniotic Membrane Allograft · 4.0 x 3.0 cm', 'ea'),
    ('BioTissue', 'NX-UR-6030', 'Neox RT - Hydrated, Room Temperature Ultra-Thick Amniotic Membrane Allograft · 6.0 x 3.0 cm', 'ea'),
    ('BioTissue', 'NX-UR-8030', 'Neox RT - Hydrated, Room Temperature Ultra-Thick Amniotic Membrane Allograft · 8.0 x 3.0 cm', 'ea'),
    -- BioTissue: Clarix Flo (micronized amniotic membrane)
    ('BioTissue', 'CR-FL-25MG', 'Clarix Flo - Micronized Amniotic Membrane · 25 mg', 'ea'),
    ('BioTissue', 'CR-FL-50MG', 'Clarix Flo - Micronized Amniotic Membrane · 50 mg', 'ea'),
    ('BioTissue', 'CR-FL-100MG', 'Clarix Flo - Micronized Amniotic Membrane · 100 mg', 'ea'),

    -- TelaBio: OviTex family (codes added for stable SKU keys in CRM)
    ('TelaBio', 'OTX-CORE', 'OviTex Core — designed to reinforce primary hernia repairs where the device will not come into contact with viscera.', 'ea'),
    ('TelaBio', 'OTX-1S', 'OviTex 1S — smooth side designed to minimize tissue attachment and reinforce primary hernia repairs where the device may contact viscera (e.g. intraperitoneal).', 'ea'),
    ('TelaBio', 'OTX-2S', 'OviTex 2S — eight layers of tissue for added strength; two smooth sides make it suitable for intraperitoneal placement.', 'ea'),
    ('TelaBio', 'OTX-LPR', 'OviTex LPR — designed specifically for minimally invasive procedures; includes a smooth side suitable for intraperitoneal placement.', 'ea'),
    ('TelaBio', 'OTX-IHR', 'OviTex IHR — designed for inguinal hernia repair procedures with anatomical and rectangular shape options for surgeon preference.', 'ea')
) AS v(family, sku, description, uom)
  ON lower(trim(p.name)) = lower(trim(v.family))
WHERE NOT EXISTS (SELECT 1 FROM public.surgical_sales_product_skus s WHERE s.sku = v.sku);

-- Remove temporary placeholders now that real variants exist.
DELETE FROM public.surgical_sales_product_skus
WHERE sku IN ('PLACEHOLDER-BIOTISSUE', 'PLACEHOLDER-TELABIO');
