-- Manufacturer / product-line closed sales vs quota (admin scorecard).
-- First use: BioTissue RGV + Laredo monthly closed dollars from the Q4 2025–Q1 2026 tracker.
-- These are typed monthly totals, not surgical cases.

CREATE TABLE IF NOT EXISTS public.sales_product_line_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_line text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_product_line_quotas_month_check CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT sales_product_line_quotas_year_check CHECK (year BETWEEN 2000 AND 2100),
  CONSTRAINT sales_product_line_quotas_amount_check CHECK (amount >= 0),
  CONSTRAINT sales_product_line_quotas_unique UNIQUE (product_line, year, month)
);

CREATE TABLE IF NOT EXISTS public.sales_product_line_closed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_line text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  region text NOT NULL,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  updated_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_product_line_closed_month_check CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT sales_product_line_closed_year_check CHECK (year BETWEEN 2000 AND 2100),
  CONSTRAINT sales_product_line_closed_amount_check CHECK (amount >= 0),
  CONSTRAINT sales_product_line_closed_region_check CHECK (region IN ('RGV', 'Laredo')),
  CONSTRAINT sales_product_line_closed_source_check CHECK (source IN ('manual', 'import', 'derived')),
  CONSTRAINT sales_product_line_closed_unique UNIQUE (product_line, year, month, region)
);

CREATE INDEX IF NOT EXISTS idx_sales_product_line_quotas_line_year
  ON public.sales_product_line_quotas (product_line, year, month);

CREATE INDEX IF NOT EXISTS idx_sales_product_line_closed_line_year
  ON public.sales_product_line_closed (product_line, year, month, region);

COMMENT ON TABLE public.sales_product_line_quotas IS
  'Monthly manufacturer quota for a product line. Not split by territory.';

COMMENT ON TABLE public.sales_product_line_closed IS
  'Monthly manufacturer-recognized closed sales by product line and territory region.';

ALTER TABLE public.sales_product_line_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_product_line_closed ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.sales_product_line_quotas TO service_role;
GRANT ALL ON public.sales_product_line_closed TO service_role;
REVOKE ALL ON public.sales_product_line_quotas FROM PUBLIC;
REVOKE ALL ON public.sales_product_line_closed FROM PUBLIC;
GRANT SELECT ON public.sales_product_line_quotas TO authenticated;
GRANT SELECT ON public.sales_product_line_closed TO authenticated;

DROP POLICY IF EXISTS sales_product_line_quotas_select ON public.sales_product_line_quotas;
CREATE POLICY sales_product_line_quotas_select ON public.sales_product_line_quotas
  FOR SELECT TO authenticated
  USING ((SELECT public.surgical_sales_is_internal_portal_admin()));

DROP POLICY IF EXISTS sales_product_line_closed_select ON public.sales_product_line_closed;
CREATE POLICY sales_product_line_closed_select ON public.sales_product_line_closed
  FOR SELECT TO authenticated
  USING ((SELECT public.surgical_sales_is_internal_portal_admin()));

-- 2026 BioTissue monthly quota (territory total, not RGV vs Laredo).
INSERT INTO public.sales_product_line_quotas (product_line, year, month, amount)
VALUES
  ('BioTissue', 2026, 1, 56366.00),
  ('BioTissue', 2026, 2, 57850.00),
  ('BioTissue', 2026, 3, 60293.00),
  ('BioTissue', 2026, 4, 62017.00),
  ('BioTissue', 2026, 5, 57284.00),
  ('BioTissue', 2026, 6, 62634.00),
  ('BioTissue', 2026, 7, 65073.00),
  ('BioTissue', 2026, 8, 62382.00),
  ('BioTissue', 2026, 9, 61162.00),
  ('BioTissue', 2026, 10, 67856.00),
  ('BioTissue', 2026, 11, 59821.00),
  ('BioTissue', 2026, 12, 69821.00)
ON CONFLICT (product_line, year, month) DO NOTHING;

-- Closed sales imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx.
-- Aug–Dec 2026 were $0 / blank in the file and are left unentered on purpose.
INSERT INTO public.sales_product_line_closed (product_line, year, month, region, amount, source, notes)
VALUES
  ('BioTissue', 2025, 10, 'RGV', 33125.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2025, 10, 'Laredo', 13200.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2025, 11, 'RGV', 41150.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2025, 11, 'Laredo', 14400.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2025, 12, 'RGV', 56675.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2025, 12, 'Laredo', 13990.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 1, 'RGV', 39725.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 1, 'Laredo', 13200.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 2, 'RGV', 40775.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 2, 'Laredo', 15690.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 3, 'RGV', 24225.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 3, 'Laredo', 13500.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 4, 'RGV', 44660.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 4, 'Laredo', 13800.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 5, 'RGV', 14400.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 5, 'Laredo', 10200.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 6, 'RGV', 150930.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 6, 'Laredo', 16415.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 7, 'RGV', 67377.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx'),
  ('BioTissue', 2026, 7, 'Laredo', 62446.00, 'import', 'Imported from Q4 2025 - Q1 2026 BioTissue Sales.xlsx')
ON CONFLICT (product_line, year, month, region) DO NOTHING;
