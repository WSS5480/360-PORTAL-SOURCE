-- Local portal tables required by admin login, orders, invoicing, and fulfillment.
-- Synthetic data only. This is not a production dump.

CREATE TYPE public.order_status AS ENUM (
  'DRAFT', 'SENT', 'CONFIRMED', 'FULFILLING', 'COMPLETED', 'CANCELLED',
  'LOCKED', 'NEEDS_INVOICE', 'INVOICED', 'PARTIALLY_PAID', 'PAID', 'PENDING_WIRE'
);

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.account_pricing (
  account_id uuid PRIMARY KEY REFERENCES public.accounts (id),
  discount_percent numeric NOT NULL DEFAULT 0,
  payment_terms_label text,
  payment_terms_days integer,
  bulk_enabled boolean NOT NULL DEFAULT false,
  bulk_rules jsonb
);

CREATE TABLE public.account_users (
  account_id uuid NOT NULL REFERENCES public.accounts (id),
  user_id uuid NOT NULL,
  role text,
  disabled_at timestamptz,
  virtual_warehouse_access boolean,
  PRIMARY KEY (account_id, user_id)
);

CREATE TABLE public.account_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts (id),
  user_id uuid,
  email text,
  full_name text
);

CREATE TABLE public.account_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid,
  email text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  archived_at timestamptz
);

CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY,
  email text,
  full_name text,
  is_staff boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  is_internal_sales_rep boolean NOT NULL DEFAULT false
);

CREATE TABLE public.internal_users (
  user_id uuid PRIMARY KEY,
  role text NOT NULL
);

CREATE TABLE public.staff_user_roles (
  user_id uuid NOT NULL,
  role text NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id),
  sku text NOT NULL,
  size_label text,
  base_unit_price numeric NOT NULL,
  width_cm numeric,
  length_cm numeric,
  total_sqcm numeric,
  is_active boolean NOT NULL DEFAULT true,
  manufacturer text
);

CREATE TABLE public.product_variant_inventory (
  variant_id uuid PRIMARY KEY REFERENCES public.product_variants (id),
  qty_on_hand numeric NOT NULL DEFAULT 0,
  updated_at timestamptz
);

CREATE TABLE public.variant_inventory (
  variant_id uuid PRIMARY KEY REFERENCES public.product_variants (id),
  on_hand numeric NOT NULL DEFAULT 0,
  updated_at timestamptz
);

CREATE TABLE public.product_variant_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants (id),
  qty numeric NOT NULL DEFAULT 0,
  lot_number text,
  serial_number text,
  expiration_date date,
  raw_scan text,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_variant_barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants (id),
  barcode text
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts (id),
  order_number text NOT NULL UNIQUE,
  status public.order_status NOT NULL,
  created_by_user_id uuid REFERENCES public.user_profiles (user_id),
  submitted_by_contact_id uuid REFERENCES public.account_contacts (id),
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
  virtual_warehouse_shipment boolean NOT NULL DEFAULT false,
  placed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id),
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

CREATE TABLE public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  from_status text,
  to_status text,
  changed_by_user_id uuid,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid,
  actor_user_id uuid,
  action text,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  actor_user_id text,
  action text,
  meta jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  account_id uuid,
  invoice_number text,
  invoice_kind text NOT NULL DEFAULT 'PRIMARY',
  status text,
  subtotal numeric,
  shipping_total numeric,
  tax numeric DEFAULT 0,
  total numeric,
  amount_paid numeric NOT NULL DEFAULT 0,
  paid_at timestamptz,
  invoice_address jsonb,
  delivery_address jsonb,
  discount_percent_snapshot numeric,
  payment_terms_label_snapshot text,
  payment_terms_days_snapshot integer,
  metadata jsonb,
  created_by_user_id uuid,
  issued_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id),
  order_item_id uuid,
  product_variant_id uuid,
  description text,
  quantity numeric,
  uom text,
  unit_price numeric,
  discount_percent numeric,
  line_total numeric,
  line_type text,
  sort_order integer
);

CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  amount numeric,
  note text,
  created_by_user_id uuid,
  payment_method text,
  confirmation_code text,
  external_payment_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stripe_payment_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text NOT NULL UNIQUE,
  invoice_id uuid,
  order_id uuid,
  amount numeric NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  payment_method text,
  confirmation_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  invoice_id uuid,
  status text NOT NULL,
  fulfillment_source text,
  created_by_user_id uuid,
  tracking_number text,
  dropship_vendor_id uuid,
  dropship_status text,
  dropship_packing_slip_number text,
  dropship_tracking_number text,
  dropship_carrier text,
  dropship_ship_date date,
  dropship_notes text,
  po_number text,
  po_sent_at timestamptz,
  po_sent_to text,
  po_pdf_bucket text,
  po_pdf_path text,
  metadata jsonb,
  shipped_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fulfillment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id uuid NOT NULL REFERENCES public.fulfillments (id),
  order_item_id uuid,
  variant_id uuid,
  description text,
  required_qty numeric,
  picked_qty numeric NOT NULL DEFAULT 0,
  uom text,
  sort_order integer
);

CREATE TABLE public.fulfillment_item_trace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_item_id uuid,
  fulfillment_id uuid,
  variant_id uuid,
  qty numeric,
  lot_number text,
  serial_number text,
  expiration_date date,
  source text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fulfillment_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id uuid,
  fulfillment_item_id uuid,
  order_id uuid,
  invoice_id uuid,
  variant_id uuid,
  qty numeric,
  lot_row_id uuid,
  raw_scan text,
  note text,
  is_undo boolean,
  meta jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid,
  delta numeric,
  resulting_on_hand numeric,
  reason text,
  actor_user_id uuid,
  meta jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dropship_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid,
  name text,
  email text,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ivr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text,
  account_id uuid,
  patient_first_name text,
  patient_last_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-private', 'order-private', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
