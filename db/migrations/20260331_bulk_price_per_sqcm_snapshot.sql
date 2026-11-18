-- Snapshot bulk tier base price ($/sq cm) on orders for historical accuracy (rules may change later).
ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS bulk_price_per_sqcm_snapshot numeric;

COMMENT ON COLUMN orders.bulk_price_per_sqcm_snapshot IS 'Locked-in bulk tier $/sq cm when bulk_mode is true (replaces percent-based bulk snapshot).';
