-- Columns the fulfillment and inventory routes already read and write.
-- Additive and safe where the columns already exist. Apply to the local database only from the test runner.

ALTER TABLE public.product_variant_lots
  ADD COLUMN IF NOT EXISTS raw_scan text,
  ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE public.fulfillment_item_trace
  ADD COLUMN IF NOT EXISTS variant_id uuid,
  ADD COLUMN IF NOT EXISTS lot_number text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS expiration_date date,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
