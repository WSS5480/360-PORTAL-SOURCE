-- Tables the partner order API and fulfillment worker read or write.
-- This is the integration slice of the portal schema, not a copy of production data.

CREATE TYPE order_status AS ENUM (
  'DRAFT', 'SENT', 'CONFIRMED', 'FULFILLING', 'COMPLETED', 'CANCELLED',
  'LOCKED', 'NEEDS_INVOICE', 'INVOICED', 'PARTIALLY_PAID', 'PAID', 'PENDING_WIRE'
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false
);

CREATE TABLE account_pricing (
  account_id uuid PRIMARY KEY REFERENCES accounts (id),
  discount_percent numeric NOT NULL DEFAULT 0,
  payment_terms_label text,
  payment_terms_days integer
);

CREATE TABLE products (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products (id),
  sku text NOT NULL,
  size_label text,
  base_unit_price numeric NOT NULL,
  width_cm numeric,
  length_cm numeric,
  total_sqcm numeric,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE product_variant_inventory (
  variant_id uuid PRIMARY KEY REFERENCES product_variants (id),
  qty_on_hand numeric NOT NULL DEFAULT 0
);

CREATE TABLE orders (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts (id),
  order_number text NOT NULL UNIQUE,
  status order_status NOT NULL,
  created_by_user_id uuid NULL,
  shipping_priority text,
  shipping_eta_days integer,
  bulk_mode boolean,
  bulk_contract_sqcm numeric,
  total_sqcm numeric,
  discount_percent_snapshot numeric,
  bulk_price_per_sqcm_snapshot numeric,
  payment_terms_label_snapshot text,
  payment_terms_days_snapshot integer,
  invoice_address jsonb,
  delivery_address jsonb,
  subtotal numeric,
  shipping_total numeric,
  total numeric,
  placed_at timestamptz
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id),
  sort_order integer,
  product_variant_id uuid,
  description text,
  quantity numeric,
  uom text,
  unit_price numeric,
  discount_percent numeric,
  line_total numeric,
  line_type text,
  virtual_warehouse_qty integer
);

CREATE TABLE order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  from_status text,
  to_status text,
  changed_by_user_id uuid NULL,
  comment text
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid,
  actor_user_id uuid NULL,
  action text,
  resource_type text,
  resource_id uuid,
  metadata jsonb
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  invoice_number text,
  invoice_kind text NOT NULL DEFAULT 'PRIMARY',
  status text,
  total numeric,
  issued_at timestamptz,
  voided_at timestamptz
);

CREATE TABLE fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  status text NOT NULL,
  tracking_number text,
  dropship_tracking_number text,
  dropship_carrier text,
  shipped_at timestamptz,
  closed_at timestamptz,
  metadata jsonb
);
