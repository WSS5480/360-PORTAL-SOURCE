-- Named inventory bins/locations for product_variant_lots.location (text) and admin UI.

CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_locations_name_lower
  ON public.inventory_locations (lower(trim(name)));

ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.inventory_locations IS 'Canonical location names for warehouse bins; lots store location as matching text.';
