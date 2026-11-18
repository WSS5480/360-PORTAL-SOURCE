-- Schema-only bootstrap for a new development database.
-- Exported from the working portal database system catalogs on 2026-11-11.
-- No application rows are included. Do not replay db/migrations on top of this file.
-- See db/baseline/README.md.

SET search_path = public, auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_graphql";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'extension pg_graphql is not installed on this server';
END $$;
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_net";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'extension pg_net is not installed on this server';
END $$;
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'extension pg_stat_statements is not installed on this server';
END $$;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgjwt";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'extension pgjwt is not installed on this server';
END $$;
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "supabase_vault";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'extension supabase_vault is not installed on this server';
END $$;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE TYPE public."account_user_role" AS ENUM ('ACCOUNT_ADMIN', 'ORDER_VIEWER', 'ORDER_CREATOR', 'IVR_SUBMITTER', 'READ_ONLY', 'INTERNAL_ADMIN', 'IVR_STAFF', 'INTERNAL_SALES_REP');
CREATE TYPE public."audit_action" AS ENUM ('INVITE_SENT', 'INVITE_ACCEPTED', 'LOGIN_SUCCESS', 'LOGOUT', 'IVR_CREATED', 'IVR_VIEWED', 'IVR_STATUS_CHANGED', 'IVR_NOTE_ADDED', 'FILE_UPLOADED', 'FILE_DOWNLOADED', 'ORDER_CREATED', 'ORDER_VIEWED', 'ORDER_STATUS_CHANGED', 'ORDER_ITEM_ADDED', 'ORDER_ITEM_REMOVED');
CREATE TYPE public."documents_share_mode" AS ENUM ('all', 'admin_only', 'selected');
CREATE TYPE public."file_classification" AS ENUM ('PHI', 'NON_PHI');
CREATE TYPE public."ivr_status" AS ENUM ('NEW', 'IN_REVIEW', 'NEEDS_INFO', 'SUBMITTED', 'COMPLETED', 'DENIED');
CREATE TYPE public."note_visibility" AS ENUM ('INTERNAL', 'SHARED');
CREATE TYPE public."order_status" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'FULFILLING', 'COMPLETED', 'CANCELLED', 'LOCKED', 'NEEDS_INVOICE', 'INVOICED', 'PARTIALLY_PAID', 'PAID', 'PENDING_WIRE');
CREATE TYPE public."pos_code" AS ENUM ('11', '12', '22', '24', '31', '32', 'OTHER');
CREATE TYPE public."sales_command_document_access" AS ENUM ('all_reps', 'territory_managers', 'admin_only');
CREATE TYPE public."staff_role" AS ENUM ('IVR_PROCESSOR', 'ORDER_MANAGER', 'ADMIN');

CREATE SEQUENCE public."ivr_email_outbox_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE public."surgical_sales_case_number_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE;

CREATE TABLE public."account_addresses" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "label" text NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "address" jsonb NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "disabled_at" timestamp with time zone,
  CONSTRAINT "account_addresses_kind_check" CHECK (kind = ANY (ARRAY['BILLING'::text, 'SHIPPING'::text])),
  CONSTRAINT "account_addresses_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."account_contacts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "full_name" text,
  "email" text NOT NULL,
  "phone" text,
  "title" text,
  "created_by_user_id" uuid,
  "user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  CONSTRAINT "account_contacts_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."account_invites" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" public.account_user_role NOT NULL,
  "invited_by_user_id" uuid,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "invite_token" text,
  "full_name" text,
  "archived_at" timestamp with time zone,
  CONSTRAINT "account_invites_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."account_portal_people" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "email" text NOT NULL,
  "full_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by_user_id" uuid,
  "invited_at" timestamp with time zone,
  "accepted_user_id" uuid,
  CONSTRAINT "account_portal_people_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."account_pricing" (
  "account_id" uuid NOT NULL,
  "discount_percent" numeric DEFAULT 0 NOT NULL,
  "payment_terms_label" text,
  "payment_terms_days" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "bulk_enabled" boolean DEFAULT false NOT NULL,
  "bulk_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "virtual_warehouse_enabled" boolean DEFAULT false NOT NULL,
  "virtual_sqcm_balance" numeric(20,4) DEFAULT 0 NOT NULL,
  "vw_delivery_slip_ledger_note" text,
  CONSTRAINT "account_pricing_pkey" PRIMARY KEY (account_id)
);

CREATE TABLE public."account_provider_profiles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "provider_name" text NOT NULL,
  "provider_npi" text,
  "provider_tax_id" text,
  "provider_ptan" text,
  "address1" text,
  "address2" text,
  "city" text,
  "state" text,
  "zip" text,
  "office_contact_name" text,
  "phone" text,
  "phone_ext" text,
  "fax" text,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "account_provider_profiles_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."account_users" (
  "account_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" public.account_user_role NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "disabled_at" timestamp with time zone,
  "virtual_warehouse_access" boolean DEFAULT true NOT NULL,
  CONSTRAINT "account_users_pkey" PRIMARY KEY (account_id, user_id)
);

CREATE TABLE public."account_virtual_inventory" (
  "account_id" uuid NOT NULL,
  "product_variant_id" uuid NOT NULL,
  "quantity" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "account_virtual_inventory_quantity_check" CHECK (quantity >= 0),
  CONSTRAINT "account_virtual_inventory_pkey" PRIMARY KEY (account_id, product_variant_id)
);

CREATE TABLE public."account_vw_delivery_slips" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "sent_on" date NOT NULL,
  "title" text NOT NULL,
  "line_summary" text,
  "sqcm_debited" numeric(20,4) NOT NULL,
  "storage_bucket" text NOT NULL,
  "storage_path" text NOT NULL,
  "filename" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by_user_id" uuid,
  CONSTRAINT "account_vw_delivery_slips_sqcm_debited_check" CHECK (sqcm_debited >= 0::numeric),
  CONSTRAINT "account_vw_delivery_slips_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."accounts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "billing_email" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "discount_percent" numeric(5,2) DEFAULT 0 NOT NULL,
  "surgical_crm_type" text,
  "surgical_crm_billing_address" text,
  "surgical_crm_shipping_address" text,
  "surgical_crm_phone" text,
  "surgical_crm_website" text,
  "surgical_crm_status" text,
  "surgical_crm_notes" text,
  "surgical_crm_created_by" uuid,
  "surgical_crm_updated_at" timestamp with time zone,
  "surgical_crm_archived_at" timestamp with time zone,
  "surgical_crm_billing_city" text,
  "surgical_crm_billing_state" text,
  "surgical_crm_billing_postal_code" text,
  "surgical_crm_archived_by" uuid,
  "is_demo" boolean DEFAULT false NOT NULL,
  "stripe_customer_id" text,
  CONSTRAINT "accounts_discount_percent_range" CHECK (discount_percent >= 0::numeric AND discount_percent <= 100::numeric),
  CONSTRAINT "accounts_surgical_crm_status_check" CHECK (surgical_crm_status IS NULL OR (surgical_crm_status = ANY (ARRAY['active'::text, 'inactive'::text, 'prospect'::text]))),
  CONSTRAINT "accounts_surgical_crm_type_check" CHECK (surgical_crm_type IS NULL OR (surgical_crm_type = ANY (ARRAY['hospital'::text, 'asc'::text, 'clinic'::text, 'practice'::text, 'distributor'::text, 'other'::text]))),
  CONSTRAINT "accounts_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."admin_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "action" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."admin_internal_notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "notification_type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "dedupe_key" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_internal_notifications_type_check" CHECK (notification_type = ANY (ARRAY['time_off_request'::text, 'time_off_decision'::text])),
  CONSTRAINT "admin_internal_notifications_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."audit_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid,
  "actor_user_id" uuid,
  "action" public.audit_action NOT NULL,
  "resource_type" text,
  "resource_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."credentialing_platforms" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "name_normalized" text NOT NULL,
  "aliases" text[] DEFAULT '{}'::text[] NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "notes" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "credentialing_platforms_pkey" PRIMARY KEY (id),
  CONSTRAINT "credentialing_platforms_name_normalized_unique" UNIQUE (name_normalized)
);

CREATE TABLE public."documents_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "folder_id" uuid NOT NULL,
  "title" text,
  "filename" text,
  "storage_bucket" text DEFAULT 'documents-private'::text NOT NULL,
  "storage_path" text,
  "content_type" text,
  "size_bytes" bigint,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "external_url" text,
  CONSTRAINT "documents_files_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."documents_folder_accounts" (
  "folder_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  CONSTRAINT "documents_folder_accounts_pkey" PRIMARY KEY (folder_id, account_id)
);

CREATE TABLE public."documents_folders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "parent_id" uuid,
  "account_id" uuid,
  "share_mode" public.documents_share_mode DEFAULT 'admin_only'::public.documents_share_mode,
  CONSTRAINT "documents_folders_no_self_parent" CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT "documents_folders_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."dropship_vendors" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "address" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "notes" text,
  "disabled_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dropship_vendors_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."execution_leaderboard_settings" (
  "id" integer DEFAULT 1 NOT NULL,
  "enabled_metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "metric_points" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "category_weights" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by_user_id" uuid,
  CONSTRAINT "execution_leaderboard_settings_id_check" CHECK (id = 1),
  CONSTRAINT "execution_leaderboard_settings_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "owner_type" text NOT NULL,
  "owner_id" uuid NOT NULL,
  "classification" public.file_classification DEFAULT 'PHI'::public.file_classification NOT NULL,
  "storage_bucket" text NOT NULL,
  "storage_path" text NOT NULL,
  "original_filename" text NOT NULL,
  "mime_type" text,
  "byte_size" bigint,
  "uploaded_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "files_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."fulfillment_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fulfillment_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "bucket" text NOT NULL,
  "object_path" text NOT NULL,
  "original_name" text,
  "mime_type" text,
  "uploaded_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fulfillment_files_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."fulfillment_item_trace" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fulfillment_id" uuid NOT NULL,
  "fulfillment_item_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "source" text DEFAULT 'DROPSHIP'::text NOT NULL,
  "lot_number" text,
  "serial_number" text,
  "expiration_date" date,
  "qty" numeric DEFAULT 1 NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fulfillment_item_trace_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."fulfillment_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fulfillment_id" uuid NOT NULL,
  "order_item_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "description" text NOT NULL,
  "required_qty" numeric DEFAULT 0 NOT NULL,
  "picked_qty" numeric DEFAULT 0 NOT NULL,
  "uom" text DEFAULT 'Units'::text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fulfillment_items_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."fulfillment_picks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fulfillment_id" uuid NOT NULL,
  "fulfillment_item_id" uuid NOT NULL,
  "order_id" uuid,
  "invoice_id" uuid,
  "variant_id" uuid NOT NULL,
  "qty" numeric NOT NULL,
  "lot_row_id" uuid,
  "raw_scan" text,
  "note" text,
  "is_undo" boolean DEFAULT false NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fulfillment_picks_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."fulfillments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "invoice_id" uuid,
  "status" text DEFAULT 'OPEN'::text NOT NULL,
  "created_by_user_id" uuid,
  "closed_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "shipped_at" timestamp with time zone,
  "tracking_number" text,
  "fulfillment_source" text DEFAULT 'INVENTORY'::text NOT NULL,
  "dropship_vendor_id" uuid,
  "po_number" text,
  "po_sent_at" timestamp with time zone,
  "po_sent_to" text,
  "po_pdf_bucket" text,
  "po_pdf_path" text,
  "dropship_status" text,
  "dropship_packing_slip_number" text,
  "dropship_tracking_number" text,
  "dropship_carrier" text,
  "dropship_ship_date" date,
  "dropship_notes" text,
  "dropship_packing_slip_bucket" text,
  "dropship_packing_slip_path" text,
  "dropship_packing_slip_uploaded_at" timestamp with time zone,
  CONSTRAINT "fulfillments_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."internal_users" (
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'ADMIN'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "internal_users_pkey" PRIMARY KEY (user_id)
);

CREATE TABLE public."inventory_locations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_locations_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."inventory_movements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "variant_id" uuid NOT NULL,
  "delta" numeric NOT NULL,
  "resulting_on_hand" numeric NOT NULL,
  "reason" text NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ip" inet,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."invoice_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "order_item_id" uuid,
  "product_variant_id" uuid,
  "description" text NOT NULL,
  "quantity" numeric DEFAULT 1 NOT NULL,
  "uom" text DEFAULT 'Units'::text NOT NULL,
  "unit_price" numeric DEFAULT 0 NOT NULL,
  "discount_percent" numeric DEFAULT 0 NOT NULL,
  "line_total" numeric,
  "line_type" text DEFAULT 'PRODUCT'::text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."invoice_payment_submissions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "method" text NOT NULL,
  "amount" numeric(12,2) DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'PENDING'::text NOT NULL,
  "reference" text,
  "sent_at" timestamp with time zone,
  "note" text,
  "created_by_user_id" uuid,
  "verified_by_user_id" uuid,
  "verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "proof_bucket" text,
  "proof_path" text,
  "stripe_payment_intent_status" text,
  CONSTRAINT "invoice_payment_submissions_method_check" CHECK (method = ANY (ARRAY['WIRE'::text, 'STRIPE'::text])),
  CONSTRAINT "invoice_payment_submissions_status_check" CHECK (status = ANY (ARRAY['PENDING'::text, 'WIRE_PENDING'::text, 'PENDING_BANK'::text, 'VERIFIED'::text, 'REJECTED'::text])),
  CONSTRAINT "invoice_payment_submissions_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."invoice_payments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "amount" numeric(12,2) DEFAULT 0 NOT NULL,
  "note" text,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invoice_payments_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."invoices" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "invoice_number" text,
  "status" text DEFAULT 'DRAFT'::text NOT NULL,
  "issued_at" timestamp with time zone,
  "voided_at" timestamp with time zone,
  "discount_percent_snapshot" numeric DEFAULT 0 NOT NULL,
  "payment_terms_label_snapshot" text,
  "payment_terms_days_snapshot" integer,
  "invoice_address" jsonb,
  "delivery_address" jsonb,
  "subtotal" numeric,
  "shipping_total" numeric,
  "total" numeric,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "tax" numeric,
  "amount_paid" numeric DEFAULT 0,
  "paid_at" timestamp with time zone,
  "invoice_kind" text DEFAULT 'PRIMARY'::text NOT NULL,
  CONSTRAINT "invoices_invoice_kind_check" CHECK (invoice_kind = ANY (ARRAY['PRIMARY'::text, 'SHIPPING_SUPPLEMENT'::text])),
  CONSTRAINT "invoices_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."ivr_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ivr_request_id" uuid NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "action" text NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ip" inet,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ivr_audit_log_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."ivr_coverage_templates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "body" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ivr_coverage_templates_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."ivr_email_outbox" (
  "id" bigint DEFAULT nextval('public.ivr_email_outbox_id_seq'::regclass) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "status" text DEFAULT 'PENDING'::text NOT NULL,
  "type" text NOT NULL,
  "to_email" text NOT NULL,
  "cc_emails" text[] DEFAULT '{}'::text[] NOT NULL,
  "subject" text NOT NULL,
  "body_text" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "last_error" text,
  CONSTRAINT "ivr_email_outbox_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."ivr_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ivr_request_id" uuid NOT NULL,
  "bucket" text NOT NULL,
  "object_path" text NOT NULL,
  "file_type" text NOT NULL,
  "uploaded_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ivr_files_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."ivr_insurance_verifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ivr_request_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "notify_to" text NOT NULL,
  "notify_cc" text[] DEFAULT '{}'::text[] NOT NULL,
  "results" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "pdf_bucket" text,
  "pdf_object_path" text,
  "results_emails" text[] DEFAULT '{}'::text[] NOT NULL,
  "distributor_email" text,
  CONSTRAINT "ivr_insurance_verifications_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."ivr_notes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ivr_id" uuid NOT NULL,
  "author_user_id" uuid,
  "visibility" public.note_visibility DEFAULT 'INTERNAL'::public.note_visibility NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ivr_notes_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."ivr_phi" (
  "ivr_id" uuid NOT NULL,
  "patient_first_name" text,
  "patient_last_name" text,
  "patient_dob" date,
  "member_id" text,
  "payer_phone" text,
  "provider_npi" text,
  "notes" text,
  CONSTRAINT "ivr_phi_pkey" PRIMARY KEY (ivr_id)
);

CREATE TABLE public."ivr_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "status" public.ivr_status DEFAULT 'NEW'::public.ivr_status NOT NULL,
  "created_by_user_id" uuid,
  "assigned_to_user_id" uuid,
  "payer_name" text,
  "submitted_at" timestamp with time zone,
  "last_customer_activity_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "provider_profile_id" uuid,
  "patient_first_name" text,
  "patient_last_name" text,
  "patient_dob" date,
  "patient_address1" text,
  "patient_city" text,
  "patient_state" text,
  "patient_zip" text,
  "primary_insurance" text,
  "primary_policy" text,
  "secondary_insurance" text,
  "secondary_policy" text,
  "facility_name" text,
  "facility_npi" text,
  "facility_tax_id" text,
  "facility_address1" text,
  "facility_city" text,
  "facility_state" text,
  "facility_zip" text,
  "place_of_service" public.pos_code,
  "dos" date,
  "product" text,
  "qcode" text,
  "product_size" text,
  "units_cm2" numeric,
  "icd10_codes" text[],
  "cpt_codes" text[],
  "result_emails" text[],
  "distributor_name" text,
  "distributor_email" text,
  "provider_name" text,
  "provider_npi" text,
  "provider_tax_id" text,
  "provider_ptan" text,
  "provider_address1" text,
  "provider_city" text,
  "provider_state" text,
  "provider_zip" text,
  "office_contact_name" text,
  "office_phone" text,
  "office_phone_ext" text,
  "office_fax" text,
  "notes" text,
  "submitted_by_user_id" uuid,
  "contact_id" uuid,
  "additional_info_requested_at" timestamp with time zone,
  "additional_info_requested_by" uuid,
  "additional_info_message" text,
  "additional_info_submitted_at" timestamp with time zone,
  "additional_info_response" text,
  "hospice_enrolled" boolean,
  "phi_authorized" boolean,
  "phi_authorized_at" timestamp with time zone,
  "ivr_identifier" text,
  CONSTRAINT "ivr_requests_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."ivr_status_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ivr_id" uuid NOT NULL,
  "from_status" public.ivr_status,
  "to_status" public.ivr_status NOT NULL,
  "changed_by_user_id" uuid,
  "comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ivr_status_events_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."ops_order_queue" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "status" text DEFAULT 'OPEN'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "claimed_by_user_id" uuid,
  "claimed_at" timestamp with time zone,
  "metadata" jsonb,
  CONSTRAINT "ops_order_queue_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."order_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "action" text NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ip" inet,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "order_audit_log_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."order_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "product_variant_id" uuid,
  "description" text NOT NULL,
  "quantity" numeric DEFAULT 1 NOT NULL,
  "uom" text DEFAULT 'Units'::text NOT NULL,
  "unit_price" numeric DEFAULT 0 NOT NULL,
  "discount_percent" numeric DEFAULT 0 NOT NULL,
  "line_total" numeric,
  "line_type" text DEFAULT 'PRODUCT'::text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "virtual_warehouse_qty" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "order_items_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."order_status_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "from_status" public.order_status,
  "to_status" public.order_status NOT NULL,
  "changed_by_user_id" uuid,
  "comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "order_status_events_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."orders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "order_number" text NOT NULL,
  "status" public.order_status DEFAULT 'DRAFT'::public.order_status NOT NULL,
  "created_by_user_id" uuid,
  "placed_at" timestamp with time zone,
  "locked_at" timestamp with time zone,
  "discount_percent_snapshot" numeric DEFAULT 0 NOT NULL,
  "payment_terms_label_snapshot" text,
  "payment_terms_days_snapshot" integer,
  "invoice_address" jsonb,
  "delivery_address" jsonb,
  "subtotal" numeric,
  "shipping_total" numeric,
  "total" numeric,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "shipping_priority" text,
  "shipping_eta_days" integer,
  "shipping_estimated_days" integer,
  "submitted_by_contact_id" uuid,
  "bulk_mode" boolean DEFAULT false NOT NULL,
  "total_sqcm" numeric,
  "virtual_warehouse_shipment" boolean DEFAULT false NOT NULL,
  "bulk_contract_sqcm" numeric(14,4),
  "bulk_price_per_sqcm_snapshot" numeric,
  CONSTRAINT "orders_shipping_estimated_days_chk" CHECK (shipping_estimated_days IS NULL OR shipping_estimated_days >= 1 AND shipping_estimated_days <= 30),
  CONSTRAINT "orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "orders_order_number_key" UNIQUE (order_number)
);

CREATE TABLE public."product_variant_barcodes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "variant_id" uuid NOT NULL,
  "barcode" text NOT NULL,
  "kind" text DEFAULT 'GTIN'::text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_variant_barcodes_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_variant_barcodes_barcode_key" UNIQUE (barcode)
);

CREATE TABLE public."product_variant_inventory" (
  "variant_id" uuid NOT NULL,
  "qty_on_hand" numeric DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_variant_inventory_pkey" PRIMARY KEY (variant_id)
);

CREATE TABLE public."product_variant_lots" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "variant_id" uuid NOT NULL,
  "lot_number" text NOT NULL,
  "serial_number" text,
  "expiration_date" date,
  "qty" numeric DEFAULT 1 NOT NULL,
  "raw_scan" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "location" text,
  CONSTRAINT "product_variant_lots_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_variant_lots_uniq" UNIQUE (variant_id, lot_number, serial_number)
);

CREATE TABLE public."product_variants" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "sku" text NOT NULL,
  "size_label" text,
  "width_cm" numeric,
  "length_cm" numeric,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "base_unit_price" numeric DEFAULT 0 NOT NULL,
  "total_sqcm" numeric,
  "bulk_enabled" boolean DEFAULT false NOT NULL,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_variants_sku_key" UNIQUE (sku)
);

CREATE TABLE public."products" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "code" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "qcode" text,
  "brochure_file_id" uuid,
  "base_unit_price" numeric DEFAULT 0 NOT NULL,
  "bulk_enabled" boolean DEFAULT false NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."provider_clinical_discovery_answers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL,
  "question_key" text NOT NULL,
  "question_label" text NOT NULL,
  "question_text" text NOT NULL,
  "response" text DEFAULT ''::text NOT NULL,
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "confidence" text,
  "source_case_id" uuid,
  "source_notes" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "provider_clinical_discovery_answers_confidence_check" CHECK (confidence IS NULL OR (confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
  CONSTRAINT "provider_clinical_discovery_answers_question_key_check" CHECK (question_key = ANY (ARRAY['clinical_workflow'::text, 'or_environment'::text, 'relationship_intelligence'::text, 'commercial_signals'::text, 'observation_readiness'::text])),
  CONSTRAINT "provider_clinical_discovery_answers_pkey" PRIMARY KEY (id),
  CONSTRAINT "provider_clinical_discovery_answers_provider_question_uq" UNIQUE (provider_id, question_key)
);

CREATE TABLE public."sales_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "activity_type" text NOT NULL,
  "summary" text NOT NULL,
  "activity_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_activities_activity_type_check" CHECK (activity_type = ANY (ARRAY['call'::text, 'email'::text, 'meeting'::text, 'note'::text, 'other'::text])),
  CONSTRAINT "sales_activities_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."sales_command_document_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "folder_id" uuid NOT NULL,
  "title" text NOT NULL,
  "filename" text,
  "storage_bucket" text DEFAULT 'documents-private'::text NOT NULL,
  "storage_path" text,
  "content_type" text,
  "size_bytes" bigint,
  "external_url" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_command_document_files_source_chk" CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL),
  CONSTRAINT "sales_command_document_files_title_chk" CHECK (char_length(TRIM(BOTH FROM title)) > 0),
  CONSTRAINT "sales_command_document_files_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."sales_command_document_folders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "parent_id" uuid,
  "name" text NOT NULL,
  "description" text,
  "access_level" public.sales_command_document_access DEFAULT 'all_reps'::public.sales_command_document_access NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_command_document_folders_name_chk" CHECK (char_length(TRIM(BOTH FROM name)) > 0),
  CONSTRAINT "sales_command_document_folders_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."sales_operational_notes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "body" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "related_entities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "note_type" text DEFAULT 'general'::text NOT NULL,
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "workflow_stage" text,
  "product_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "provider_id" uuid,
  "organization_id" uuid,
  "case_id" uuid,
  "opportunity_id" uuid,
  "task_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "source" text DEFAULT 'manual'::text NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_case_activity_id" uuid,
  "legacy_provider_activity_id" uuid,
  "ai_extraction_json" jsonb,
  CONSTRAINT "sales_operational_notes_entity_type_check" CHECK (entity_type = ANY (ARRAY['case'::text, 'provider'::text, 'opportunity'::text, 'organization'::text])),
  CONSTRAINT "sales_operational_notes_source_check" CHECK (source = ANY (ARRAY['manual'::text, 'ai'::text, 'imported'::text])),
  CONSTRAINT "sales_operational_notes_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."sales_opportunities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "account_name" text NOT NULL,
  "physician_name" text,
  "product_line" text DEFAULT 'General'::text NOT NULL,
  "value_cents" bigint DEFAULT 0 NOT NULL,
  "stage" text DEFAULT 'discovery'::text NOT NULL,
  "territory" text,
  "close_date" date,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "product_id" uuid,
  "practice_setting" text DEFAULT 'private_practice'::text NOT NULL,
  "closed_lost_reason" text,
  "additional_product_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "account_id" uuid,
  "city" text,
  "state" text,
  "surgeon_champion_confirmed" boolean DEFAULT false NOT NULL,
  "surgeon_champion_name" text,
  "surgeon_contact_id" uuid,
  "procedure_focus" text,
  "adoption_goal" text,
  "evaluation_needed" boolean DEFAULT false NOT NULL,
  "preference_card_target" text,
  "competitive_product" text,
  "next_action" text,
  "source_engagement_id" uuid,
  "source_case_id" uuid,
  CONSTRAINT "sales_opportunities_practice_setting_check" CHECK (practice_setting = ANY (ARRAY['hospital'::text, 'private_practice'::text, 'mobile'::text, 'other'::text])),
  CONSTRAINT "sales_opportunities_stage_check" CHECK (stage = ANY (ARRAY['discovery'::text, 'clinical_validation'::text, 'evaluation_planned'::text, 'evaluation_active'::text, 'outcome_review'::text, 'preference_card_progress'::text, 'adoption_expanding'::text, 'won'::text, 'lost'::text])),
  CONSTRAINT "sales_opportunities_value_cents_check" CHECK (value_cents >= 0),
  CONSTRAINT "sales_opportunities_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."sales_organization_product_approvals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "status" text DEFAULT 'not_started'::text NOT NULL,
  "champion_contact_id" uuid,
  "submitted_at" timestamp with time zone,
  "approved_at" timestamp with time zone,
  "notes" text,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_organization_product_approvals_status_check" CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'submitted'::text, 'under_review'::text, 'approved'::text, 'denied'::text])),
  CONSTRAINT "sales_organization_product_approvals_pkey" PRIMARY KEY (id),
  CONSTRAINT "sales_organization_product_approvals_unique_org_product" UNIQUE (organization_id, product_id)
);

CREATE TABLE public."sales_organizations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "discount_percent" numeric DEFAULT 0 NOT NULL,
  "surgical_crm_type" text,
  "surgical_crm_billing_address" text,
  "surgical_crm_shipping_address" text,
  "surgical_crm_phone" text,
  "surgical_crm_website" text,
  "surgical_crm_status" text,
  "surgical_crm_notes" text,
  "surgical_crm_created_by" uuid,
  "surgical_crm_updated_at" timestamp with time zone,
  "surgical_crm_archived_at" timestamp with time zone,
  "surgical_crm_archived_by" uuid,
  "surgical_crm_billing_city" text,
  "surgical_crm_billing_state" text,
  "surgical_crm_billing_postal_code" text,
  "linked_ordering_account_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_organizations_surgical_crm_status_check" CHECK (surgical_crm_status IS NULL OR (surgical_crm_status = ANY (ARRAY['active'::text, 'inactive'::text, 'prospect'::text]))),
  CONSTRAINT "sales_organizations_surgical_crm_type_check" CHECK (surgical_crm_type IS NULL OR (surgical_crm_type = ANY (ARRAY['hospital'::text, 'asc'::text, 'clinic'::text, 'practice'::text, 'distributor'::text, 'other'::text]))),
  CONSTRAINT "sales_organizations_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."sales_pre_call_plan_template_favorites" (
  "user_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_pre_call_plan_template_favorites_pkey" PRIMARY KEY (user_id, template_id)
);

CREATE TABLE public."sales_pre_call_plan_templates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "product_line" text NOT NULL,
  "template_engagement_type" text NOT NULL,
  "observation_goal" text,
  "pre_observation_impact_opening_statement" text,
  "pre_observation_probes" text,
  "pre_observation_tools_resources" text,
  "pre_observation_value_hypothesis" text,
  "pre_observation_planned_close" text,
  "suggested_next_step" text,
  "pre_observation_additional_notes" text,
  "is_system" boolean DEFAULT false NOT NULL,
  "owner_user_id" uuid,
  "duplicated_from_id" uuid,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "procedure_focus" text,
  "smart_objective" text,
  "opening_statement" text,
  "probes" text,
  "tools_resources" text,
  "value_hypothesis" text,
  "planned_close" text,
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  CONSTRAINT "sales_pre_call_plan_templates_engagement_type_check" CHECK (template_engagement_type = ANY (ARRAY['intro_call'::text, 'observation_request'::text, 'follow_up'::text, 'product_demo'::text, 'evaluation_planning'::text, 'evaluation_follow_up'::text, 'or_visit'::text, 'office_visit_360'::text, 'in_service_training'::text, 'preference_card_discussion'::text, 'post_case_follow_up'::text, 'provider_debrief'::text, 'reactivation'::text, 'peer_discussion'::text])),
  CONSTRAINT "sales_pre_call_plan_templates_owner_check" CHECK (is_system = true AND owner_user_id IS NULL OR is_system = false AND owner_user_id IS NOT NULL),
  CONSTRAINT "sales_pre_call_plan_templates_product_line_check" CHECK (product_line = ANY (ARRAY['ACSIS'::text, 'BioTissue'::text, 'TelaBio'::text, 'Skeletal Dynamics'::text, 'Endolumik'::text])),
  CONSTRAINT "sales_pre_call_plan_templates_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])),
  CONSTRAINT "sales_pre_call_plan_templates_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."sales_product_line_closed" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "product_line" text NOT NULL,
  "year" integer NOT NULL,
  "month" integer NOT NULL,
  "region" text NOT NULL,
  "amount" numeric(12,2) DEFAULT 0 NOT NULL,
  "source" text DEFAULT 'manual'::text NOT NULL,
  "notes" text,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_product_line_closed_amount_check" CHECK (amount >= 0::numeric),
  CONSTRAINT "sales_product_line_closed_month_check" CHECK (month >= 1 AND month <= 12),
  CONSTRAINT "sales_product_line_closed_region_check" CHECK (region = ANY (ARRAY['RGV'::text, 'Laredo'::text])),
  CONSTRAINT "sales_product_line_closed_source_check" CHECK (source = ANY (ARRAY['manual'::text, 'import'::text, 'derived'::text])),
  CONSTRAINT "sales_product_line_closed_year_check" CHECK (year >= 2000 AND year <= 2100),
  CONSTRAINT "sales_product_line_closed_pkey" PRIMARY KEY (id),
  CONSTRAINT "sales_product_line_closed_unique" UNIQUE (product_line, year, month, region)
);

CREATE TABLE public."sales_product_line_quotas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "product_line" text NOT NULL,
  "year" integer NOT NULL,
  "month" integer NOT NULL,
  "amount" numeric(12,2) DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_product_line_quotas_amount_check" CHECK (amount >= 0::numeric),
  CONSTRAINT "sales_product_line_quotas_month_check" CHECK (month >= 1 AND month <= 12),
  CONSTRAINT "sales_product_line_quotas_year_check" CHECK (year >= 2000 AND year <= 2100),
  CONSTRAINT "sales_product_line_quotas_pkey" PRIMARY KEY (id),
  CONSTRAINT "sales_product_line_quotas_unique" UNIQUE (product_line, year, month)
);

CREATE TABLE public."sales_rep_manager_assignments" (
  "rep_user_id" uuid NOT NULL,
  "manager_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_rep_manager_assignments_no_self_chk" CHECK (rep_user_id <> manager_user_id),
  CONSTRAINT "sales_rep_manager_assignments_pkey" PRIMARY KEY (rep_user_id)
);

CREATE TABLE public."sales_rep_state_coverage" (
  "user_id" uuid NOT NULL,
  "state_code" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_rep_state_coverage_state_code_chk" CHECK (state_code ~ '^[A-Z]{2}$'::text),
  CONSTRAINT "sales_rep_state_coverage_pkey" PRIMARY KEY (user_id, state_code)
);

CREATE TABLE public."sales_rep_time_off_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "requester_user_id" uuid NOT NULL,
  "request_type" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "notes" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "review_comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_rep_time_off_requests_dates_check" CHECK (end_date >= start_date),
  CONSTRAINT "sales_rep_time_off_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text, 'cancelled'::text])),
  CONSTRAINT "sales_rep_time_off_requests_type_check" CHECK (request_type = ANY (ARRAY['pto'::text, 'sick'::text, 'personal'::text])),
  CONSTRAINT "sales_rep_time_off_requests_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."sales_tasks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "due_date" date NOT NULL,
  "completed_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sales_tasks_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."staff_user_roles" (
  "user_id" uuid NOT NULL,
  "role" public.staff_role NOT NULL,
  CONSTRAINT "staff_user_roles_pkey" PRIMARY KEY (user_id, role)
);

CREATE TABLE public."surgical_sales_admin_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "action" text NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ip" text,
  "user_agent" text,
  CONSTRAINT "surgical_sales_admin_audit_log_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_case_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "activity_type" text NOT NULL,
  "body" text DEFAULT ''::text NOT NULL,
  "metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_case_activities_type_check" CHECK (activity_type = ANY (ARRAY['note'::text, 'status_change'::text, 'document_uploaded'::text, 'document_deleted'::text, 'product_updated'::text, 'billing_update'::text, 'case_created'::text, 'case_updated'::text, 'case_archived'::text, 'case_restored'::text, 'provider_intelligence_promoted'::text, 'clinical_discovery_insight_from_case'::text, 'provider_debrief_planned'::text, 'pre_call_plan_created'::text, 'pre_call_plan_updated'::text, 'pre_call_plan_completed'::text, 'ai_note_capture'::text, 'case_linked_from_engagement'::text, 'case_created_from_engagement'::text, 'engagement_created'::text, 'engagement_updated'::text, 'engagement_completed'::text, 'engagement_converted_to_case'::text, 'engagement_prepared'::text])),
  CONSTRAINT "surgical_sales_case_activities_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_case_documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid NOT NULL,
  "document_type" text NOT NULL,
  "file_name" text NOT NULL,
  "file_url" text,
  "storage_key" text,
  "uploaded_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_case_documents_storage_check" CHECK (file_url IS NOT NULL OR storage_key IS NOT NULL),
  CONSTRAINT "surgical_sales_case_documents_type_check" CHECK (document_type = ANY (ARRAY['purchase_order'::text, 'invoice'::text, 'packing_slip'::text, 'consignment_form'::text, 'implant_log'::text, 'observation_form'::text, 'other'::text])),
  CONSTRAINT "surgical_sales_case_documents_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_case_products" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "sku_id" uuid,
  "expected_quantity" numeric(14,4),
  "actual_quantity" numeric(14,4),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_case_products_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_cases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "case_number" text NOT NULL,
  "account_id" uuid NOT NULL,
  "surgeon_contact_id" uuid,
  "sales_rep_id" uuid NOT NULL,
  "case_date" date,
  "case_time" time without time zone,
  "procedure_type" text,
  "product_id" uuid,
  "status" text DEFAULT 'scheduled'::text NOT NULL,
  "expected_revenue" numeric(14,2) DEFAULT 0 NOT NULL,
  "actual_revenue" numeric(14,2),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "billing_reviewed_at" timestamp with time zone,
  "billing_reviewed_by_user_id" uuid,
  "billing_admin_notes" text,
  "archived_at" timestamp with time zone,
  "archived_by_user_id" uuid,
  "case_type" text DEFAULT 'product_support'::text NOT NULL,
  "observation_goal" text,
  "follow_up_needed" boolean DEFAULT false NOT NULL,
  "related_opportunity_id" uuid,
  "pre_observation_impact_opening_statement" text,
  "pre_observation_probes" text,
  "pre_observation_tools_resources" text,
  "pre_observation_value_hypothesis" text,
  "pre_observation_planned_close" text,
  "pre_observation_additional_notes" text,
  "live_observation_workflow" text,
  "live_observation_clinical_pain_points" text,
  "live_observation_surgeon_reactions" text,
  "live_observation_product_fit" text,
  "live_observation_competitors" text,
  "live_observation_staff_process" text,
  "live_observation_questions" text,
  "live_observation_follow_up_items" text,
  "debrief_key_findings" text,
  "debrief_opportunity_score" integer,
  "debrief_recommended_next_stage" text,
  "debrief_product_opportunity_identified" boolean DEFAULT false NOT NULL,
  "debrief_suggested_next_action" text,
  "debrief_convert_to_product_support_case" boolean DEFAULT false NOT NULL,
  "pre_call_hospital_name" text,
  "pre_call_surgeon_name" text,
  "engagement_id" uuid,
  "case_implants_on_site" text,
  "case_trays_sterilization_status" text,
  "case_room_assignment" text,
  "case_support_coverage" text,
  "case_planned_arrival_time" text,
  "case_product_needs" text,
  "case_operational_risks" text,
  "observation_key_questions" text,
  "observation_signals_to_validate" text,
  "observation_access_scheduling_owner" text,
  "observation_access_pathway" text,
  "observation_access_credentialing" text,
  "observation_access_vendor_restrictions" text,
  "observation_access_preferred_timing" text,
  "observation_access_metadata" jsonb,
  "observation_validation_targets" jsonb,
  "observation_quick_finding_product_interest" text,
  "case_support_outcome" text,
  "case_support_provider_reaction" text,
  "case_support_case_result" text,
  "case_support_next_step" text,
  "observation_started_at" timestamp with time zone,
  "observation_completed_at" timestamp with time zone,
  "observation_workflow_intelligence_snapshot" jsonb,
  CONSTRAINT "surgical_sales_cases_actual_revenue_check" CHECK (actual_revenue IS NULL OR actual_revenue >= 0::numeric),
  CONSTRAINT "surgical_sales_cases_case_type_check" CHECK (case_type = ANY (ARRAY['observation'::text, 'product_support'::text])),
  CONSTRAINT "surgical_sales_cases_debrief_opportunity_score_check" CHECK (debrief_opportunity_score IS NULL OR debrief_opportunity_score >= 0 AND debrief_opportunity_score <= 100),
  CONSTRAINT "surgical_sales_cases_debrief_recommended_next_stage_check" CHECK (debrief_recommended_next_stage IS NULL OR (debrief_recommended_next_stage = ANY (ARRAY['discovery'::text, 'case_observations'::text, 'validate_clinical_needs'::text, 'secure_trial_evaluation_cases'::text, 'present_data_tell_story'::text, 'won_update_pref_card'::text, 'closed_lost'::text]))),
  CONSTRAINT "surgical_sales_cases_expected_revenue_check" CHECK (expected_revenue >= 0::numeric),
  CONSTRAINT "surgical_sales_cases_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'rescheduled'::text, 'confirmed'::text, 'completed'::text, 'docs_needed'::text, 'billing_review'::text, 'invoiced'::text, 'closed'::text, 'cancelled'::text])),
  CONSTRAINT "surgical_sales_cases_pkey" PRIMARY KEY (id),
  CONSTRAINT "surgical_sales_cases_case_number_unique" UNIQUE (case_number)
);

CREATE TABLE public."surgical_sales_contact_organizations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contact_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "role_type" text DEFAULT 'other'::text NOT NULL,
  "is_primary_org" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "specialty" text,
  "relationship_notes" text,
  "preferred_hospital" text,
  "influence_level" text DEFAULT 'unknown'::text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_contact_organizations_pkey" PRIMARY KEY (id),
  CONSTRAINT "surgical_sales_contact_orgs_unique" UNIQUE (contact_id, account_id)
);

CREATE TABLE public."surgical_sales_contact_relationships" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "primary_contact_id" uuid NOT NULL,
  "related_contact_id" uuid NOT NULL,
  "relationship_type" text DEFAULT 'other'::text NOT NULL,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ownership_type" text,
  "workflow_role" text,
  CONSTRAINT "surgical_sales_contact_relationships_not_self" CHECK (primary_contact_id <> related_contact_id),
  CONSTRAINT "surgical_sales_contact_relationships_ownership_type_check" CHECK (ownership_type IS NULL OR (ownership_type = ANY (ARRAY['provider'::text, 'organization'::text, 'shared'::text]))),
  CONSTRAINT "surgical_sales_contact_relationships_type_check" CHECK (relationship_type = ANY (ARRAY['office_manager'::text, 'scheduler'::text, 'assistant'::text, 'gatekeeper'::text, 'billing_contact'::text, 'purchasing_contact'::text, 'colleague'::text, 'reports_to'::text, 'works_with'::text, 'other'::text])),
  CONSTRAINT "surgical_sales_contact_relationships_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_contacts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "first_name" text DEFAULT ''::text NOT NULL,
  "last_name" text DEFAULT ''::text NOT NULL,
  "title" text,
  "email" text,
  "phone" text,
  "role_type" text DEFAULT 'other'::text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "created_by_user_id" uuid,
  "organization_id" uuid,
  "mobile_phone" text,
  "influence_level" text DEFAULT 'unknown'::text NOT NULL,
  "relationship_strength" text DEFAULT 'unknown'::text NOT NULL,
  "is_primary_contact" boolean DEFAULT false NOT NULL,
  "created_by" uuid,
  "preferred_contact_method" text DEFAULT 'unknown'::text NOT NULL,
  "best_time_to_contact" text,
  "access_notes" text,
  "personality_notes" text,
  "do_not_contact" boolean DEFAULT false NOT NULL,
  "last_contacted_at" timestamp with time zone,
  "next_follow_up_at" timestamp with time zone,
  "provider_strategic_goal" text,
  "provider_procedure_focus" text,
  "provider_product_interests" text,
  "provider_pre_observation_impact_opening_statement" text,
  "provider_pre_observation_probes" text,
  "provider_pre_observation_tools_resources" text,
  "provider_pre_observation_value_hypothesis" text,
  "provider_pre_observation_planned_close" text,
  "provider_pre_observation_additional_notes" text,
  "provider_planning_updated_at" timestamp with time zone,
  "provider_onboarding_status" text DEFAULT 'active'::text,
  "provider_case_volume_estimate" text,
  "provider_current_vendors" text,
  "provider_competitive_products" text,
  "provider_evaluation_openness" text,
  "provider_or_team_dynamics" text,
  "provider_first_observation_questions" text,
  "provider_decision_maker_status" text,
  "provider_champion_potential" text,
  "provider_communication_style" text,
  "provider_follow_up_approach" text,
  "provider_rep_strategy_notes" text,
  "provider_clinical_discovery_modality_challenge" text,
  "provider_clinical_discovery_why_challenge" text,
  "provider_clinical_discovery_implications" text,
  "provider_clinical_discovery_causes" text,
  "provider_clinical_discovery_frequency" text,
  "provider_clinical_discovery_priority_now" text,
  "provider_clinical_discovery_priority_rank" text,
  "provider_clinical_discovery_prior_attempts" text,
  "provider_clinical_discovery_if_unaddressed" text,
  "provider_clinical_discovery_modality_challenge_confidence" text,
  "provider_clinical_discovery_modality_challenge_source" text,
  "provider_clinical_discovery_modality_challenge_tags" text,
  "provider_clinical_discovery_modality_challenge_updated_at" timestamp with time zone,
  "provider_clinical_discovery_why_challenge_confidence" text,
  "provider_clinical_discovery_why_challenge_source" text,
  "provider_clinical_discovery_why_challenge_tags" text,
  "provider_clinical_discovery_why_challenge_updated_at" timestamp with time zone,
  "provider_clinical_discovery_implications_confidence" text,
  "provider_clinical_discovery_implications_source" text,
  "provider_clinical_discovery_implications_tags" text,
  "provider_clinical_discovery_implications_updated_at" timestamp with time zone,
  "provider_clinical_discovery_causes_confidence" text,
  "provider_clinical_discovery_causes_source" text,
  "provider_clinical_discovery_causes_tags" text,
  "provider_clinical_discovery_causes_updated_at" timestamp with time zone,
  "provider_clinical_discovery_frequency_confidence" text,
  "provider_clinical_discovery_frequency_source" text,
  "provider_clinical_discovery_frequency_tags" text,
  "provider_clinical_discovery_frequency_updated_at" timestamp with time zone,
  "provider_clinical_discovery_priority_now_confidence" text,
  "provider_clinical_discovery_priority_now_source" text,
  "provider_clinical_discovery_priority_now_tags" text,
  "provider_clinical_discovery_priority_now_updated_at" timestamp with time zone,
  "provider_clinical_discovery_priority_rank_confidence" text,
  "provider_clinical_discovery_priority_rank_source" text,
  "provider_clinical_discovery_priority_rank_tags" text,
  "provider_clinical_discovery_priority_rank_updated_at" timestamp with time zone,
  "provider_clinical_discovery_prior_attempts_confidence" text,
  "provider_clinical_discovery_prior_attempts_source" text,
  "provider_clinical_discovery_prior_attempts_tags" text,
  "provider_clinical_discovery_prior_attempts_updated_at" timestamp with time zone,
  "provider_clinical_discovery_if_unaddressed_confidence" text,
  "provider_clinical_discovery_if_unaddressed_source" text,
  "provider_clinical_discovery_if_unaddressed_tags" text,
  "provider_clinical_discovery_if_unaddressed_updated_at" timestamp with time zone,
  "provider_crm_status" text DEFAULT 'prospect'::text,
  "provider_technique_preferences" text,
  "provider_preference_card_signals" text,
  "provider_relationship_stage" text DEFAULT 'early_discovery'::text,
  "provider_technique_detail" text,
  "provider_workflow_pain_points" text,
  "provider_credentialing_status" text,
  "provider_support_expectations" text,
  "provider_responsiveness" text,
  "provider_dissatisfaction_areas" text,
  "provider_observation_feasibility" text,
  "provider_ideal_observation_cases" text,
  "provider_observation_access_path" text,
  "provider_observation_credentialing_needed" text,
  "provider_observation_coordinator_contact" text,
  "provider_observation_cadence_preference" text,
  "provider_observation_best_days_case_types" text,
  "provider_intelligence_field_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "provider_facility_spd_tray_behavior" text,
  "provider_facility_logistics_notes" text,
  "provider_facility_room_turnover_patterns" text,
  "provider_credentialing_platform_id" uuid,
  "provider_credentialing_platform_name" text,
  "provider_credentialing_contact" text,
  "provider_credentialing_approval_contact" text,
  "provider_credentialing_renewal_notes" text,
  "provider_credentialing_required_documents" text,
  "provider_credentialing_facility_instructions" text,
  "provider_observation_scheduling_control" text,
  "provider_scheduling_contact" text,
  "provider_facility_scheduling_contact" text,
  "provider_clinical_frustrations" text,
  "provider_product_gaps" text,
  "provider_staff_frustrations" text,
  "provider_future_opportunity_signals" text,
  "provider_commercial_intelligence" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "provider_evaluation_path" text,
  "provider_evaluation_path_target_date" date,
  "provider_evaluation_path_notes" text,
  "provider_evaluation_marked_successful" text,
  "provider_commitment_type" text,
  "provider_commitment_product_path" text,
  "provider_commitment_start_date" date,
  "provider_commitment_notes" text,
  "provider_outcomes_tracking_active" text,
  "provider_outcomes_tracking_status" text,
  "provider_commitment_confirmed" text,
  "provider_observation_sequence_complete" text,
  "provider_product_fit_validated" text,
  "provider_evaluation_activity_status" text,
  "hidden_from_provider_directory_at" timestamp with time zone,
  CONSTRAINT "surgical_sales_contacts_influence_level_check" CHECK (influence_level = ANY (ARRAY['decision_maker'::text, 'influencer'::text, 'gatekeeper'::text, 'unknown'::text])),
  CONSTRAINT "surgical_sales_contacts_preferred_contact_method_check" CHECK (preferred_contact_method = ANY (ARRAY['email'::text, 'phone'::text, 'text'::text, 'in_person'::text, 'unknown'::text])),
  CONSTRAINT "surgical_sales_contacts_provider_crm_status_check" CHECK (provider_crm_status IS NULL OR (provider_crm_status = ANY (ARRAY['prospect'::text, 'active'::text, 'inactive'::text, 'not_targeted'::text, 'unknown'::text]))),
  CONSTRAINT "surgical_sales_contacts_provider_relationship_stage_check" CHECK (provider_relationship_stage IS NULL OR (provider_relationship_stage = ANY (ARRAY['early_discovery'::text, 'active_evaluation'::text, 'active_relationship'::text, 'established_customer'::text, 'dormant'::text, 'archived'::text]))),
  CONSTRAINT "surgical_sales_contacts_relationship_strength_check" CHECK (relationship_strength = ANY (ARRAY['strong'::text, 'medium'::text, 'weak'::text, 'unknown'::text])),
  CONSTRAINT "surgical_sales_contacts_role_type_check" CHECK (role_type = ANY (ARRAY['surgeon'::text, 'physician_assistant'::text, 'nurse'::text, 'scheduler'::text, 'office_manager'::text, 'gatekeeper'::text, 'billing'::text, 'purchasing'::text, 'admin'::text, 'assistant'::text, 'other'::text])),
  CONSTRAINT "surgical_sales_contacts_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_engagement_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "engagement_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "activity_type" text NOT NULL,
  "body" text DEFAULT ''::text NOT NULL,
  "metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_engagement_activities_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_engagements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "engagement_type" text NOT NULL,
  "status" text DEFAULT 'planned'::text NOT NULL,
  "title" text,
  "provider_id" uuid NOT NULL,
  "organization_id" uuid,
  "opportunity_id" uuid,
  "case_id" uuid,
  "sales_rep_id" uuid NOT NULL,
  "scheduled_at" timestamp with time zone,
  "engagement_date" date,
  "notes" text,
  "pre_call_hospital_name" text,
  "pre_call_surgeon_name" text,
  "observation_goal" text,
  "pre_observation_impact_opening_statement" text,
  "pre_observation_probes" text,
  "pre_observation_tools_resources" text,
  "pre_observation_value_hypothesis" text,
  "pre_observation_planned_close" text,
  "pre_observation_additional_notes" text,
  "pre_call_plan_updated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by_user_id" uuid,
  "pre_call_plan_template_id" uuid,
  "engagement_workflow_mode" text,
  "engagement_purpose" text,
  "next_action" text,
  "follow_up_tasks" text,
  "sim_lab_focus" text,
  "products_to_demonstrate" text,
  "attendees" text,
  "hands_on_goals" text,
  "adoption_signals_to_watch" text,
  "prepared_at" timestamp with time zone,
  "prepared_by_user_id" uuid,
  "prepare_checklist_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "prepare_tactical_asks" jsonb,
  "debrief_completed" boolean DEFAULT false NOT NULL,
  "debrief_completed_at" timestamp with time zone,
  "debrief_intelligence_snapshot" jsonb,
  "planning_status" text DEFAULT 'not_planned'::text NOT NULL,
  "planning_mode" text DEFAULT 'plan_first'::text NOT NULL,
  "engagement_category" text,
  "briefing_id" uuid,
  "source_observation_id" uuid,
  "product_focus" text,
  "scheduled_date" date,
  "briefing_status" text DEFAULT 'not_planned'::text NOT NULL,
  "completion_pathway_stage_before" text,
  "completion_pathway_stage_after" text,
  CONSTRAINT "surgical_sales_engagements_briefing_status_check" CHECK (briefing_status = ANY (ARRAY['not_planned'::text, 'planning_in_progress'::text, 'planned'::text])),
  CONSTRAINT "surgical_sales_engagements_engagement_category_check" CHECK (engagement_category IS NULL OR (engagement_category = ANY (ARRAY['observation_discovery'::text, 'product_evaluation'::text, 'relationship_management'::text]))),
  CONSTRAINT "surgical_sales_engagements_planning_mode_check" CHECK (planning_mode = ANY (ARRAY['quick_add'::text, 'plan_first'::text])),
  CONSTRAINT "surgical_sales_engagements_planning_status_check" CHECK (planning_status = ANY (ARRAY['not_planned'::text, 'planning_in_progress'::text, 'planned'::text])),
  CONSTRAINT "surgical_sales_engagements_status_check" CHECK (status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  CONSTRAINT "surgical_sales_engagements_type_check" CHECK (engagement_type = ANY (ARRAY['intro_call'::text, 'observation_request'::text, 'follow_up'::text, 'product_demo'::text, 'evaluation_planning'::text, 'evaluation_follow_up'::text, 'or_visit'::text, 'office_visit_360'::text, 'in_service_training'::text, 'preference_card_discussion'::text, 'post_case_follow_up'::text, 'provider_debrief'::text, 'reactivation'::text, 'peer_discussion'::text])),
  CONSTRAINT "surgical_sales_engagements_workflow_mode_check" CHECK (engagement_workflow_mode IS NULL OR (engagement_workflow_mode = ANY (ARRAY['strategic'::text, 'lightweight'::text]))),
  CONSTRAINT "surgical_sales_engagements_pkey" PRIMARY KEY (id),
  CONSTRAINT "surgical_sales_engagements_case_id_key" UNIQUE (case_id)
);

CREATE TABLE public."surgical_sales_phi_warning_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "case_id" uuid,
  "surface" text NOT NULL,
  "detected_kinds" text[] DEFAULT '{}'::text[] NOT NULL,
  CONSTRAINT "surgical_sales_phi_warning_events_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_product_intelligence_candidates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "document_id" uuid,
  "run_id" uuid,
  "knowledge_type" text NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "evidence" text,
  "confidence" text DEFAULT 'medium'::text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "reviewed_by_user_id" uuid,
  "reviewed_at" timestamp with time zone,
  "admin_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_product_intelligence_candidates_confidence_check" CHECK (confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
  CONSTRAINT "surgical_sales_product_intelligence_candidates_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  CONSTRAINT "surgical_sales_product_intelligence_candidates_type_check" CHECK (knowledge_type = ANY (ARRAY['what_it_does'::text, 'procedures'::text, 'problems_solved'::text, 'buying_signals'::text, 'workflow_pain_points'::text, 'evaluation_questions'::text, 'objections'::text, 'competitors'::text, 'stakeholders'::text, 'differentiators'::text, 'other'::text])),
  CONSTRAINT "surgical_sales_product_intelligence_candidates_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_product_intelligence_documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "file_id" uuid,
  "source_url" text,
  "title" text NOT NULL,
  "document_type" text DEFAULT 'product_document'::text NOT NULL,
  "extracted_text" text,
  "extraction_status" text DEFAULT 'uploaded'::text NOT NULL,
  "uploaded_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_product_intelligence_documents_status_check" CHECK (extraction_status = ANY (ARRAY['uploaded'::text, 'text_extracted'::text, 'text_unavailable'::text, 'analysis_pending'::text, 'analysis_complete'::text, 'analysis_failed'::text])),
  CONSTRAINT "surgical_sales_product_intelligence_documents_type_check" CHECK (document_type = ANY (ARRAY['product_document'::text, 'brochure'::text, 'ifu'::text, 'clinical_paper'::text, 'competitor_reference'::text, 'research_note'::text, 'other'::text])),
  CONSTRAINT "surgical_sales_product_intelligence_documents_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_product_intelligence_runs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "document_id" uuid,
  "run_type" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "model" text,
  "prompt_summary" text,
  "raw_result" jsonb,
  "error_message" text,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "surgical_sales_product_intelligence_runs_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'running'::text, 'complete'::text, 'failed'::text])),
  CONSTRAINT "surgical_sales_product_intelligence_runs_type_check" CHECK (run_type = ANY (ARRAY['document_analysis'::text, 'ai_research'::text, 'manual_seed'::text])),
  CONSTRAINT "surgical_sales_product_intelligence_runs_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_product_skus" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "sku" text NOT NULL,
  "description" text,
  "unit_of_measure" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_product_skus_pkey" PRIMARY KEY (id),
  CONSTRAINT "surgical_sales_product_skus_sku_unique" UNIQUE (sku)
);

CREATE TABLE public."surgical_sales_products" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "category" text DEFAULT ''::text NOT NULL,
  "description" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_products_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_provider_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "activity_type" text NOT NULL,
  "body" text DEFAULT ''::text NOT NULL,
  "metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_provider_activities_type_check" CHECK (activity_type = ANY (ARRAY['clinical_discovery_updated'::text, 'provider_updated'::text, 'provider_created'::text, 'provider_intelligence_promoted'::text, 'planning_section_completed'::text, 'pre_call_plan_created'::text, 'pre_call_plan_updated'::text, 'pre_call_plan_completed'::text, 'engagement_created'::text, 'engagement_updated'::text, 'engagement_completed'::text, 'engagement_converted_to_case'::text, 'engagement_prepared'::text, 'case_created_from_engagement'::text, 'ai_note_capture'::text, 'note_added'::text, 'outcome_update'::text, 'product_use_log'::text])),
  CONSTRAINT "surgical_sales_provider_activities_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."surgical_sales_rep_notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "case_id" uuid NOT NULL,
  "notification_type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "dedupe_key" text,
  "read_at" timestamp with time zone,
  "email_sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "surgical_sales_rep_notifications_type_check" CHECK (notification_type = ANY (ARRAY['case_assigned'::text, 'case_upcoming_24h'::text, 'case_missing_docs_completed'::text, 'case_stuck_workflow'::text])),
  CONSTRAINT "surgical_sales_rep_notifications_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."trace_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fulfillment_id" uuid,
  "fulfillment_item_trace_id" uuid,
  "event_type" text NOT NULL,
  "location_code" text,
  "notes" text,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "trace_events_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."unified_activity_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "related_entities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "workflow_stage" text,
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "ai_generated" boolean DEFAULT false NOT NULL,
  "source" text NOT NULL,
  "legacy_source" text,
  "legacy_activity_id" uuid,
  CONSTRAINT "unified_activity_events_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."universal_surgical_fact_captures" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "raw_note" text NOT NULL,
  "declared_source_type" text NOT NULL,
  "extraction_model" text NOT NULL,
  "extraction_ms" integer,
  "provider_id" uuid,
  "organization_id" uuid,
  "case_id" uuid,
  "encounter_id" uuid,
  "operational_note_id" uuid,
  "workflow_stage" text,
  "product_context" text,
  "legacy_extraction_summary" jsonb,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "universal_surgical_fact_captures_source_check" CHECK (declared_source_type = ANY (ARRAY['intro_call'::text, 'office_visit'::text, 'discovery_note'::text, 'observation_case'::text, 'debrief_note'::text, 'debrief_validation'::text, 'product_support_case'::text, 'evaluation_note'::text, 'outcome_note'::text])),
  CONSTRAINT "universal_surgical_fact_captures_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."universal_surgical_facts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "capture_id" uuid NOT NULL,
  "provider_id" uuid,
  "organization_id" uuid,
  "case_id" uuid,
  "encounter_id" uuid,
  "concept" text NOT NULL,
  "normalized_label" text NOT NULL,
  "assertion_level" text NOT NULL,
  "source_type" text NOT NULL,
  "evidence_text" text NOT NULL,
  "confidence" text NOT NULL,
  "negated" boolean DEFAULT false NOT NULL,
  "uncertain" boolean DEFAULT false NOT NULL,
  "suppressed" boolean DEFAULT false NOT NULL,
  "product_mentioned" text,
  "person_mentioned" text,
  "item_mentioned" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "universal_surgical_facts_assertion_check" CHECK (assertion_level = ANY (ARRAY['provider_reported'::text, 'observed'::text, 'case_supported'::text, 'validated'::text, 'rejected'::text, 'evaluated'::text, 'outcome_reported'::text])),
  CONSTRAINT "universal_surgical_facts_concept_check" CHECK (concept = ANY (ARRAY['current_product'::text, 'competitor_product'::text, 'inventory_availability_issue'::text, 'requested_item'::text, 'unavailable_item'::text, 'alternative_used'::text, 'sizing_or_fit_issue'::text, 'placement_or_positioning_issue'::text, 'visualization_or_access_issue'::text, 'training_or_familiarity_issue'::text, 'workflow_or_timing_issue'::text, 'product_performance_issue'::text, 'provider_sentiment'::text, 'staff_workflow'::text, 'case_outcome'::text, 'support_needed'::text, 'next_action'::text, 'no_issue_or_routine'::text, 'procedure_volume_trend'::text, 'procedure_focus'::text, 'technology_preference'::text, 'contact_role'::text, 'access_pathway'::text, 'credentialing_requirement'::text, 'unknown'::text])),
  CONSTRAINT "universal_surgical_facts_confidence_check" CHECK (confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
  CONSTRAINT "universal_surgical_facts_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."user_profiles" (
  "user_id" uuid NOT NULL,
  "email" text NOT NULL,
  "full_name" text,
  "is_staff" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "is_admin" boolean DEFAULT false NOT NULL,
  "is_internal_sales_rep" boolean DEFAULT false NOT NULL,
  "is_territory_manager" boolean DEFAULT false NOT NULL,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY (user_id)
);

CREATE TABLE public."variant_identifiers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "variant_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "value" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "variant_identifiers_pkey" PRIMARY KEY (id)
);

CREATE TABLE public."variant_inventory" (
  "variant_id" uuid NOT NULL,
  "on_hand" numeric DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "variant_inventory_pkey" PRIMARY KEY (variant_id)
);

CREATE TABLE public."virtual_warehouse_credit_events" (
  "invoice_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "virtual_warehouse_credit_events_pkey" PRIMARY KEY (invoice_id)
);

CREATE TABLE public."virtual_warehouse_ship_debits" (
  "fulfillment_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "virtual_warehouse_ship_debits_pkey" PRIMARY KEY (fulfillment_id)
);

CREATE OR REPLACE FUNCTION private.delete_account(p_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_order_ids FROM orders WHERE account_id = p_account_id;

  IF v_order_ids IS NOT NULL AND array_length(v_order_ids, 1) > 0 THEN
    DELETE FROM fulfillment_item_trace WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillment_picks WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillment_items WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillment_files WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillments WHERE order_id = ANY(v_order_ids);
  END IF;

  IF v_order_ids IS NOT NULL AND array_length(v_order_ids, 1) > 0 THEN
    DELETE FROM order_audit_log WHERE order_id = ANY(v_order_ids);
    DELETE FROM order_status_events WHERE order_id = ANY(v_order_ids);
    DELETE FROM order_items WHERE order_id = ANY(v_order_ids);
  END IF;

  DELETE FROM orders WHERE account_id = p_account_id;

  DELETE FROM invoices WHERE account_id = p_account_id;

  DELETE FROM ivr_email_outbox WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_files WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_insurance_verifications WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_audit_log WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_requests WHERE account_id = p_account_id;

  DELETE FROM documents_folder_accounts WHERE account_id = p_account_id;
  DELETE FROM documents_files WHERE folder_id IN (SELECT id FROM documents_folders WHERE account_id = p_account_id);
  DELETE FROM documents_folders WHERE account_id = p_account_id;

  DELETE FROM account_virtual_inventory WHERE account_id = p_account_id;

  DELETE FROM account_invites WHERE account_id = p_account_id;
  DELETE FROM account_contacts WHERE account_id = p_account_id;
  DELETE FROM account_addresses WHERE account_id = p_account_id;
  DELETE FROM account_provider_profiles WHERE account_id = p_account_id;
  DELETE FROM account_users WHERE account_id = p_account_id;
  DELETE FROM account_pricing WHERE account_id = p_account_id;

  DELETE FROM accounts WHERE id = p_account_id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.is_admin_or_staff()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.internal_users WHERE user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = (SELECT auth.uid()) AND is_staff = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fulfillment_pick(p_fulfillment_item_id uuid, p_qty numeric, p_actor_user_id uuid, p_ip inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_raw_scan text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS TABLE(ok boolean, error text, variant_id uuid, picked_qty numeric, required_qty numeric, resulting_on_hand numeric)
 LANGUAGE plpgsql
AS $function$
declare
  v_fulfillment_id uuid;
  v_order_id uuid;
  v_invoice_id uuid;
  v_status text;
  v_variant_id uuid;
  v_required numeric;
  v_picked numeric;
  v_on_hand numeric;
  v_next_on_hand numeric;
  v_next_picked numeric;
begin
  if p_qty is null or p_qty <= 0 then
    return query select false, 'qty must be > 0', null::uuid, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  -- Load fulfillment item
  select fi.fulfillment_id, fi.variant_id, fi.required_qty, fi.picked_qty
    into v_fulfillment_id, v_variant_id, v_required, v_picked
  from public.fulfillment_items fi
  where fi.id = p_fulfillment_item_id;

  if v_fulfillment_id is null then
    return query select false, 'fulfillment_item not found', null::uuid, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  -- Check fulfillment session
  select f.status, f.order_id, f.invoice_id
    into v_status, v_order_id, v_invoice_id
  from public.fulfillments f
  where f.id = v_fulfillment_id;

  if v_status is null then
    return query select false, 'fulfillment not found', v_variant_id, v_picked, v_required, null::numeric;
    return;
  end if;

  if upper(v_status) <> 'OPEN' then
    return query select false, 'fulfillment is not OPEN', v_variant_id, v_picked, v_required, null::numeric;
    return;
  end if;

  v_next_picked := coalesce(v_picked, 0) + p_qty;

  -- Lock inventory row and decrement atomically
  -- Ensure variant_inventory row exists
  insert into public.variant_inventory (variant_id, on_hand)
  values (v_variant_id, 0)
  on conflict (variant_id) do nothing;

  select vi.on_hand
    into v_on_hand
  from public.variant_inventory vi
  where vi.variant_id = v_variant_id
  for update;

  if v_on_hand is null then
    return query select false, 'variant_inventory missing', v_variant_id, v_picked, v_required, null::numeric;
    return;
  end if;

  if v_on_hand < p_qty then
    return query select false, 'insufficient on_hand', v_variant_id, v_picked, v_required, v_on_hand;
    return;
  end if;

  v_next_on_hand := v_on_hand - p_qty;

  update public.variant_inventory
    set on_hand = v_next_on_hand,
        updated_at = now()
  where variant_id = v_variant_id;

  -- Update picked qty
  update public.fulfillment_items
    set picked_qty = v_next_picked,
        updated_at = now()
  where id = p_fulfillment_item_id;

  -- Write movement ledger (negative delta)
  insert into public.inventory_movements (
    variant_id,
    delta,
    resulting_on_hand,
    reason,
    actor_user_id,
    meta,
    ip,
    user_agent
  )
  values (
    v_variant_id,
    -p_qty,
    v_next_on_hand,
    'FULFILL_ORDER',
    p_actor_user_id,
    jsonb_build_object(
      'order_id', v_order_id,
      'invoice_id', v_invoice_id,
      'fulfillment_id', v_fulfillment_id,
      'fulfillment_item_id', p_fulfillment_item_id,
      'raw_scan', p_raw_scan,
      'note', p_note
    ),
    p_ip,
    p_user_agent
  );

  return query select true, null::text, v_variant_id, v_next_picked, v_required, v_next_on_hand;
end;
$function$;

CREATE OR REPLACE FUNCTION public.increment_virtual_sqcm_balance(p_account_id uuid, p_delta numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RETURN;
  END IF;
  UPDATE public.account_pricing
  SET virtual_sqcm_balance = COALESCE(virtual_sqcm_balance, 0) + p_delta
  WHERE account_id = p_account_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.surgical_sales_contacts_sync_legacy_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.account_id IS NOT NULL THEN
    NEW.organization_id := NEW.account_id;
  ELSIF NEW.organization_id IS NOT NULL AND NEW.account_id IS DISTINCT FROM NEW.organization_id THEN
    NEW.account_id := NEW.organization_id;
  END IF;

  IF NEW.created_by IS NULL AND NEW.created_by_user_id IS NOT NULL THEN
    NEW.created_by := NEW.created_by_user_id;
  ELSIF NEW.created_by IS NOT NULL AND NEW.created_by_user_id IS DISTINCT FROM NEW.created_by THEN
    NEW.created_by_user_id := NEW.created_by;
  END IF;

  IF NEW.is_primary_contact IS DISTINCT FROM coalesce(NEW.is_primary, false) THEN
    NEW.is_primary := NEW.is_primary_contact;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.surgical_sales_is_internal_portal_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
    );
$function$;

CREATE OR REPLACE FUNCTION public.surgical_sales_is_internal_sales_rep()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal_sales_rep = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.surgical_sales_set_case_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.case_number IS NULL OR btrim(NEW.case_number) = '' THEN
    NEW.case_number :=
      'SC-'
      || to_char(timezone('UTC', now()), 'MMDDYY')
      || '-'
      || lpad(nextval('public.surgical_sales_case_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_surgical_sales_contact_orgs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.try_subtract_virtual_sqcm_balance(p_account_id uuid, p_delta numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  n int;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RETURN true;
  END IF;
  UPDATE public.account_pricing
  SET virtual_sqcm_balance = virtual_sqcm_balance - p_delta
  WHERE account_id = p_account_id
    AND COALESCE(virtual_sqcm_balance, 0) >= p_delta - 0.0001;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$function$;

ALTER SEQUENCE public."ivr_email_outbox_id_seq" OWNED BY public."ivr_email_outbox"."id";

ALTER TABLE public."account_addresses" ADD CONSTRAINT "account_addresses_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."account_addresses" ADD CONSTRAINT "account_addresses_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."account_contacts" ADD CONSTRAINT "account_contacts_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."account_invites" ADD CONSTRAINT "account_invites_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."account_invites" ADD CONSTRAINT "account_invites_invited_by_user_id_fkey" FOREIGN KEY (invited_by_user_id) REFERENCES auth.users(id);
ALTER TABLE public."account_portal_people" ADD CONSTRAINT "account_portal_people_accepted_user_id_fkey" FOREIGN KEY (accepted_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."account_portal_people" ADD CONSTRAINT "account_portal_people_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."account_portal_people" ADD CONSTRAINT "account_portal_people_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."account_pricing" ADD CONSTRAINT "account_pricing_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."account_provider_profiles" ADD CONSTRAINT "account_provider_profiles_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."account_users" ADD CONSTRAINT "account_users_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."account_users" ADD CONSTRAINT "account_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."account_virtual_inventory" ADD CONSTRAINT "account_virtual_inventory_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."account_virtual_inventory" ADD CONSTRAINT "account_virtual_inventory_product_variant_id_fkey" FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
ALTER TABLE public."account_vw_delivery_slips" ADD CONSTRAINT "account_vw_delivery_slips_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."audit_events" ADD CONSTRAINT "audit_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id);
ALTER TABLE public."audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id);
ALTER TABLE public."credentialing_platforms" ADD CONSTRAINT "credentialing_platforms_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."documents_files" ADD CONSTRAINT "documents_files_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES public.documents_folders(id) ON DELETE CASCADE;
ALTER TABLE public."documents_folder_accounts" ADD CONSTRAINT "documents_folder_accounts_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public."documents_folder_accounts" ADD CONSTRAINT "documents_folder_accounts_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES public.documents_folders(id) ON DELETE CASCADE;
ALTER TABLE public."documents_folders" ADD CONSTRAINT "documents_folders_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public."documents_folders" ADD CONSTRAINT "documents_folders_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.documents_folders(id) ON DELETE CASCADE;
ALTER TABLE public."execution_leaderboard_settings" ADD CONSTRAINT "execution_leaderboard_settings_updated_by_user_id_fkey" FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."files" ADD CONSTRAINT "files_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public."files" ADD CONSTRAINT "files_uploaded_by_user_id_fkey" FOREIGN KEY (uploaded_by_user_id) REFERENCES auth.users(id);
ALTER TABLE public."fulfillment_files" ADD CONSTRAINT "fulfillment_files_fulfillment_id_fkey" FOREIGN KEY (fulfillment_id) REFERENCES public.fulfillments(id) ON DELETE CASCADE;
ALTER TABLE public."fulfillment_item_trace" ADD CONSTRAINT "fit_fulfillment_id_fkey" FOREIGN KEY (fulfillment_id) REFERENCES public.fulfillments(id) ON DELETE CASCADE;
ALTER TABLE public."fulfillment_item_trace" ADD CONSTRAINT "fit_fulfillment_item_id_fkey" FOREIGN KEY (fulfillment_item_id) REFERENCES public.fulfillment_items(id) ON DELETE CASCADE;
ALTER TABLE public."fulfillment_item_trace" ADD CONSTRAINT "fit_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;
ALTER TABLE public."fulfillment_items" ADD CONSTRAINT "fulfillment_items_fulfillment_id_fkey" FOREIGN KEY (fulfillment_id) REFERENCES public.fulfillments(id) ON DELETE CASCADE;
ALTER TABLE public."fulfillment_items" ADD CONSTRAINT "fulfillment_items_order_item_id_fkey" FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE RESTRICT;
ALTER TABLE public."fulfillment_items" ADD CONSTRAINT "fulfillment_items_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;
ALTER TABLE public."fulfillments" ADD CONSTRAINT "fulfillments_dropship_vendor_id_fkey" FOREIGN KEY (dropship_vendor_id) REFERENCES public.dropship_vendors(id) ON DELETE SET NULL;
ALTER TABLE public."fulfillments" ADD CONSTRAINT "fulfillments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public."fulfillments" ADD CONSTRAINT "fulfillments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public."inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
ALTER TABLE public."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
ALTER TABLE public."invoice_items" ADD CONSTRAINT "invoice_items_order_item_id_fkey" FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE SET NULL;
ALTER TABLE public."invoice_payment_submissions" ADD CONSTRAINT "invoice_payment_submissions_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
ALTER TABLE public."invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
ALTER TABLE public."invoices" ADD CONSTRAINT "invoices_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public."invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;
ALTER TABLE public."ivr_audit_log" ADD CONSTRAINT "ivr_audit_log_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public."ivr_audit_log" ADD CONSTRAINT "ivr_audit_log_ivr_request_id_fkey" FOREIGN KEY (ivr_request_id) REFERENCES public.ivr_requests(id) ON DELETE CASCADE;
ALTER TABLE public."ivr_files" ADD CONSTRAINT "ivr_files_ivr_request_id_fkey" FOREIGN KEY (ivr_request_id) REFERENCES public.ivr_requests(id) ON DELETE CASCADE;
ALTER TABLE public."ivr_files" ADD CONSTRAINT "ivr_files_uploaded_by_user_id_fkey" FOREIGN KEY (uploaded_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."ivr_insurance_verifications" ADD CONSTRAINT "ivr_insurance_verifications_ivr_request_id_fkey" FOREIGN KEY (ivr_request_id) REFERENCES public.ivr_requests(id) ON DELETE CASCADE;
ALTER TABLE public."ivr_notes" ADD CONSTRAINT "ivr_notes_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES auth.users(id);
ALTER TABLE public."ivr_notes" ADD CONSTRAINT "ivr_notes_ivr_id_fkey" FOREIGN KEY (ivr_id) REFERENCES public.ivr_requests(id) ON DELETE CASCADE;
ALTER TABLE public."ivr_phi" ADD CONSTRAINT "ivr_phi_ivr_id_fkey" FOREIGN KEY (ivr_id) REFERENCES public.ivr_requests(id) ON DELETE CASCADE;
ALTER TABLE public."ivr_requests" ADD CONSTRAINT "ivr_requests_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public."ivr_requests" ADD CONSTRAINT "ivr_requests_assigned_to_user_id_fkey" FOREIGN KEY (assigned_to_user_id) REFERENCES auth.users(id);
ALTER TABLE public."ivr_requests" ADD CONSTRAINT "ivr_requests_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id);
ALTER TABLE public."ivr_requests" ADD CONSTRAINT "ivr_requests_provider_profile_fk" FOREIGN KEY (provider_profile_id) REFERENCES public.account_provider_profiles(id) ON DELETE SET NULL;
ALTER TABLE public."ivr_status_events" ADD CONSTRAINT "ivr_status_events_changed_by_user_id_fkey" FOREIGN KEY (changed_by_user_id) REFERENCES auth.users(id);
ALTER TABLE public."ivr_status_events" ADD CONSTRAINT "ivr_status_events_ivr_id_fkey" FOREIGN KEY (ivr_id) REFERENCES public.ivr_requests(id) ON DELETE CASCADE;
ALTER TABLE public."ops_order_queue" ADD CONSTRAINT "ops_order_queue_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public."order_audit_log" ADD CONSTRAINT "order_audit_log_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public."order_items" ADD CONSTRAINT "order_items_product_variant_id_fkey" FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;
ALTER TABLE public."order_status_events" ADD CONSTRAINT "order_status_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public."orders" ADD CONSTRAINT "orders_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;
ALTER TABLE public."orders" ADD CONSTRAINT "orders_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES public.user_profiles(user_id) ON DELETE SET NULL;
ALTER TABLE public."orders" ADD CONSTRAINT "orders_submitted_by_contact_id_fkey" FOREIGN KEY (submitted_by_contact_id) REFERENCES public.account_contacts(id) ON DELETE SET NULL;
ALTER TABLE public."product_variant_barcodes" ADD CONSTRAINT "product_variant_barcodes_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
ALTER TABLE public."product_variant_inventory" ADD CONSTRAINT "product_variant_inventory_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
ALTER TABLE public."product_variant_lots" ADD CONSTRAINT "product_variant_lots_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
ALTER TABLE public."product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public."products" ADD CONSTRAINT "products_brochure_file_id_fkey" FOREIGN KEY (brochure_file_id) REFERENCES public.files(id) ON DELETE SET NULL;
ALTER TABLE public."provider_clinical_discovery_answers" ADD CONSTRAINT "provider_clinical_discovery_answers_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE CASCADE;
ALTER TABLE public."provider_clinical_discovery_answers" ADD CONSTRAINT "provider_clinical_discovery_answers_source_case_id_fkey" FOREIGN KEY (source_case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE SET NULL;
ALTER TABLE public."sales_activities" ADD CONSTRAINT "sales_activities_opportunity_id_fkey" FOREIGN KEY (opportunity_id) REFERENCES public.sales_opportunities(id) ON DELETE CASCADE;
ALTER TABLE public."sales_command_document_files" ADD CONSTRAINT "sales_command_document_files_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES public.sales_command_document_folders(id) ON DELETE CASCADE;
ALTER TABLE public."sales_command_document_folders" ADD CONSTRAINT "sales_command_document_folders_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.sales_command_document_folders(id) ON DELETE CASCADE;
ALTER TABLE public."sales_opportunities" ADD CONSTRAINT "sales_opportunities_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.sales_organizations(id) ON DELETE SET NULL;
ALTER TABLE public."sales_opportunities" ADD CONSTRAINT "sales_opportunities_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public."sales_opportunities" ADD CONSTRAINT "sales_opportunities_source_case_id_fkey" FOREIGN KEY (source_case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE SET NULL;
ALTER TABLE public."sales_opportunities" ADD CONSTRAINT "sales_opportunities_source_engagement_id_fkey" FOREIGN KEY (source_engagement_id) REFERENCES public.surgical_sales_engagements(id) ON DELETE SET NULL;
ALTER TABLE public."sales_opportunities" ADD CONSTRAINT "sales_opportunities_surgeon_contact_id_fkey" FOREIGN KEY (surgeon_contact_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE SET NULL;
ALTER TABLE public."sales_organization_product_approvals" ADD CONSTRAINT "sales_organization_product_approvals_champion_contact_id_fkey" FOREIGN KEY (champion_contact_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE SET NULL;
ALTER TABLE public."sales_organization_product_approvals" ADD CONSTRAINT "sales_organization_product_approvals_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.sales_organizations(id) ON DELETE CASCADE;
ALTER TABLE public."sales_organization_product_approvals" ADD CONSTRAINT "sales_organization_product_approvals_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.surgical_sales_products(id) ON DELETE RESTRICT;
ALTER TABLE public."sales_organizations" ADD CONSTRAINT "sales_organizations_linked_ordering_account_id_fkey" FOREIGN KEY (linked_ordering_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public."sales_pre_call_plan_template_favorites" ADD CONSTRAINT "sales_pre_call_plan_template_favorites_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.sales_pre_call_plan_templates(id) ON DELETE CASCADE;
ALTER TABLE public."sales_pre_call_plan_templates" ADD CONSTRAINT "sales_pre_call_plan_templates_duplicated_from_id_fkey" FOREIGN KEY (duplicated_from_id) REFERENCES public.sales_pre_call_plan_templates(id) ON DELETE SET NULL;
ALTER TABLE public."sales_rep_manager_assignments" ADD CONSTRAINT "sales_rep_manager_assignments_manager_user_id_fkey" FOREIGN KEY (manager_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."sales_rep_manager_assignments" ADD CONSTRAINT "sales_rep_manager_assignments_rep_user_id_fkey" FOREIGN KEY (rep_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."sales_rep_state_coverage" ADD CONSTRAINT "sales_rep_state_coverage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."sales_tasks" ADD CONSTRAINT "sales_tasks_opportunity_id_fkey" FOREIGN KEY (opportunity_id) REFERENCES public.sales_opportunities(id) ON DELETE CASCADE;
ALTER TABLE public."staff_user_roles" ADD CONSTRAINT "staff_user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_case_activities" ADD CONSTRAINT "surgical_sales_case_activities_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_case_documents" ADD CONSTRAINT "surgical_sales_case_documents_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_case_products" ADD CONSTRAINT "surgical_sales_case_products_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_case_products" ADD CONSTRAINT "surgical_sales_case_products_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.surgical_sales_products(id) ON DELETE RESTRICT;
ALTER TABLE public."surgical_sales_case_products" ADD CONSTRAINT "surgical_sales_case_products_sku_id_fkey" FOREIGN KEY (sku_id) REFERENCES public.surgical_sales_product_skus(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_cases" ADD CONSTRAINT "surgical_sales_cases_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.sales_organizations(id) ON DELETE RESTRICT;
ALTER TABLE public."surgical_sales_cases" ADD CONSTRAINT "surgical_sales_cases_engagement_id_fkey" FOREIGN KEY (engagement_id) REFERENCES public.surgical_sales_engagements(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_cases" ADD CONSTRAINT "surgical_sales_cases_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.surgical_sales_products(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_cases" ADD CONSTRAINT "surgical_sales_cases_related_opportunity_id_fkey" FOREIGN KEY (related_opportunity_id) REFERENCES public.sales_opportunities(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_cases" ADD CONSTRAINT "surgical_sales_cases_surgeon_contact_id_fkey" FOREIGN KEY (surgeon_contact_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_contact_organizations" ADD CONSTRAINT "surgical_sales_contact_organizations_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.sales_organizations(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_contact_organizations" ADD CONSTRAINT "surgical_sales_contact_organizations_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_contact_relationships" ADD CONSTRAINT "surgical_sales_contact_relationships_primary_contact_id_fkey" FOREIGN KEY (primary_contact_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_contact_relationships" ADD CONSTRAINT "surgical_sales_contact_relationships_related_contact_id_fkey" FOREIGN KEY (related_contact_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_contacts" ADD CONSTRAINT "surgical_sales_contacts_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.sales_organizations(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_contacts" ADD CONSTRAINT "surgical_sales_contacts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.sales_organizations(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_contacts" ADD CONSTRAINT "surgical_sales_contacts_provider_credentialing_platform_id_fkey" FOREIGN KEY (provider_credentialing_platform_id) REFERENCES public.credentialing_platforms(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_engagement_activities" ADD CONSTRAINT "surgical_sales_engagement_activities_engagement_id_fkey" FOREIGN KEY (engagement_id) REFERENCES public.surgical_sales_engagements(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_engagements" ADD CONSTRAINT "surgical_sales_engagements_briefing_id_fkey" FOREIGN KEY (briefing_id) REFERENCES public.surgical_sales_engagements(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_engagements" ADD CONSTRAINT "surgical_sales_engagements_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_engagements" ADD CONSTRAINT "surgical_sales_engagements_opportunity_id_fkey" FOREIGN KEY (opportunity_id) REFERENCES public.sales_opportunities(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_engagements" ADD CONSTRAINT "surgical_sales_engagements_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.sales_organizations(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_engagements" ADD CONSTRAINT "surgical_sales_engagements_pre_call_plan_template_id_fkey" FOREIGN KEY (pre_call_plan_template_id) REFERENCES public.sales_pre_call_plan_templates(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_engagements" ADD CONSTRAINT "surgical_sales_engagements_prepared_by_user_id_fkey" FOREIGN KEY (prepared_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_engagements" ADD CONSTRAINT "surgical_sales_engagements_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE RESTRICT;
ALTER TABLE public."surgical_sales_engagements" ADD CONSTRAINT "surgical_sales_engagements_source_observation_id_fkey" FOREIGN KEY (source_observation_id) REFERENCES public.surgical_sales_engagements(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_phi_warning_events" ADD CONSTRAINT "surgical_sales_phi_warning_events_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_product_intelligence_candidates" ADD CONSTRAINT "surgical_sales_product_intelligence_candidates_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.surgical_sales_product_intelligence_documents(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_product_intelligence_candidates" ADD CONSTRAINT "surgical_sales_product_intelligence_candidates_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.surgical_sales_products(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_product_intelligence_candidates" ADD CONSTRAINT "surgical_sales_product_intelligence_candidates_run_id_fkey" FOREIGN KEY (run_id) REFERENCES public.surgical_sales_product_intelligence_runs(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_product_intelligence_documents" ADD CONSTRAINT "surgical_sales_product_intelligence_documents_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_product_intelligence_documents" ADD CONSTRAINT "surgical_sales_product_intelligence_documents_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.surgical_sales_products(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_product_intelligence_runs" ADD CONSTRAINT "surgical_sales_product_intelligence_runs_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.surgical_sales_product_intelligence_documents(id) ON DELETE SET NULL;
ALTER TABLE public."surgical_sales_product_intelligence_runs" ADD CONSTRAINT "surgical_sales_product_intelligence_runs_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.surgical_sales_products(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_product_skus" ADD CONSTRAINT "surgical_sales_product_skus_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.surgical_sales_products(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_provider_activities" ADD CONSTRAINT "surgical_sales_provider_activities_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE CASCADE;
ALTER TABLE public."surgical_sales_rep_notifications" ADD CONSTRAINT "surgical_sales_rep_notifications_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE CASCADE;
ALTER TABLE public."universal_surgical_fact_captures" ADD CONSTRAINT "universal_surgical_fact_captures_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE SET NULL;
ALTER TABLE public."universal_surgical_fact_captures" ADD CONSTRAINT "universal_surgical_fact_captures_encounter_id_fkey" FOREIGN KEY (encounter_id) REFERENCES public.surgical_sales_engagements(id) ON DELETE SET NULL;
ALTER TABLE public."universal_surgical_fact_captures" ADD CONSTRAINT "universal_surgical_fact_captures_operational_note_id_fkey" FOREIGN KEY (operational_note_id) REFERENCES public.sales_operational_notes(id) ON DELETE SET NULL;
ALTER TABLE public."universal_surgical_fact_captures" ADD CONSTRAINT "universal_surgical_fact_captures_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.sales_organizations(id) ON DELETE SET NULL;
ALTER TABLE public."universal_surgical_fact_captures" ADD CONSTRAINT "universal_surgical_fact_captures_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE SET NULL;
ALTER TABLE public."universal_surgical_facts" ADD CONSTRAINT "universal_surgical_facts_capture_id_fkey" FOREIGN KEY (capture_id) REFERENCES public.universal_surgical_fact_captures(id) ON DELETE CASCADE;
ALTER TABLE public."universal_surgical_facts" ADD CONSTRAINT "universal_surgical_facts_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.surgical_sales_cases(id) ON DELETE SET NULL;
ALTER TABLE public."universal_surgical_facts" ADD CONSTRAINT "universal_surgical_facts_encounter_id_fkey" FOREIGN KEY (encounter_id) REFERENCES public.surgical_sales_engagements(id) ON DELETE SET NULL;
ALTER TABLE public."universal_surgical_facts" ADD CONSTRAINT "universal_surgical_facts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.sales_organizations(id) ON DELETE SET NULL;
ALTER TABLE public."universal_surgical_facts" ADD CONSTRAINT "universal_surgical_facts_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.surgical_sales_contacts(id) ON DELETE SET NULL;
ALTER TABLE public."user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."variant_identifiers" ADD CONSTRAINT "variant_identifiers_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
ALTER TABLE public."variant_inventory" ADD CONSTRAINT "variant_inventory_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
ALTER TABLE public."virtual_warehouse_credit_events" ADD CONSTRAINT "virtual_warehouse_credit_events_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
ALTER TABLE public."virtual_warehouse_ship_debits" ADD CONSTRAINT "virtual_warehouse_ship_debits_fulfillment_id_fkey" FOREIGN KEY (fulfillment_id) REFERENCES public.fulfillments(id) ON DELETE CASCADE;

CREATE INDEX account_addresses_account_id_disabled_at_idx ON public.account_addresses USING btree (account_id, disabled_at);
CREATE INDEX account_addresses_account_id_idx ON public.account_addresses USING btree (account_id);
CREATE INDEX account_addresses_account_id_kind_idx ON public.account_addresses USING btree (account_id, kind);
CREATE INDEX account_users_account_id_disabled_at_idx ON public.account_users USING btree (account_id, disabled_at);
CREATE INDEX credentialing_platforms_active_name_idx ON public.credentialing_platforms USING btree (active, name);
CREATE INDEX dropship_vendors_account_id_idx ON public.dropship_vendors USING btree (account_id, created_at DESC);
CREATE INDEX dropship_vendors_name_idx ON public.dropship_vendors USING btree (name);
CREATE INDEX fulfillment_files_fulfillment_id_kind_created_at_idx ON public.fulfillment_files USING btree (fulfillment_id, kind, created_at DESC);
CREATE INDEX fulfillment_items_fulfillment_id_sort_order_idx ON public.fulfillment_items USING btree (fulfillment_id, sort_order);
CREATE INDEX fulfillment_items_variant_id_idx ON public.fulfillment_items USING btree (variant_id);
CREATE INDEX fulfillment_item_trace_fulfillment_id_idx ON public.fulfillment_item_trace USING btree (fulfillment_id);
CREATE INDEX fulfillment_item_trace_fulfillment_item_id_idx ON public.fulfillment_item_trace USING btree (fulfillment_item_id);
CREATE INDEX fulfillment_item_trace_item_idx ON public.fulfillment_item_trace USING btree (fulfillment_id, fulfillment_item_id);
CREATE INDEX fulfillment_item_trace_lot_number_idx ON public.fulfillment_item_trace USING btree (lot_number);
CREATE INDEX fulfillment_item_trace_serial_idx ON public.fulfillment_item_trace USING btree (serial_number);
CREATE INDEX fulfillment_picks_fi_created_idx ON public.fulfillment_picks USING btree (fulfillment_item_id, created_at DESC);
CREATE INDEX fulfillment_picks_fulfillment_created_idx ON public.fulfillment_picks USING btree (fulfillment_id, created_at DESC);
CREATE INDEX fulfillment_picks_variant_created_idx ON public.fulfillment_picks USING btree (variant_id, created_at DESC);
CREATE INDEX fulfillments_dropship_packing_slip_path_idx ON public.fulfillments USING btree (dropship_packing_slip_path);
CREATE INDEX fulfillments_dropship_vendor_id_idx ON public.fulfillments USING btree (dropship_vendor_id);
CREATE INDEX fulfillments_order_id_created_at_idx ON public.fulfillments USING btree (order_id, created_at DESC);
CREATE INDEX fulfillments_status_created_at_idx ON public.fulfillments USING btree (status, created_at DESC);
CREATE INDEX fulfillments_tracking_number_idx ON public.fulfillments USING btree (tracking_number);
CREATE INDEX idx_account_invites_account ON public.account_invites USING btree (account_id);
CREATE INDEX idx_account_invites_archived_at_null ON public.account_invites USING btree (created_at DESC) WHERE (archived_at IS NULL);
CREATE INDEX idx_account_invites_email ON public.account_invites USING btree (email);
CREATE INDEX idx_accounts_is_demo ON public.accounts USING btree (is_demo) WHERE (is_demo = true);
CREATE INDEX idx_accounts_surgical_crm_archived ON public.accounts USING btree (surgical_crm_archived_at) WHERE (surgical_crm_archived_at IS NULL);
CREATE INDEX idx_accounts_surgical_crm_status ON public.accounts USING btree (surgical_crm_status) WHERE (surgical_crm_status IS NOT NULL);
CREATE INDEX idx_account_virtual_inventory_account ON public.account_virtual_inventory USING btree (account_id);
CREATE INDEX idx_account_vw_delivery_slips_account_created ON public.account_vw_delivery_slips USING btree (account_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_actor ON public.admin_audit_log USING btree (actor_user_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log USING btree (created_at);
CREATE INDEX idx_admin_internal_notifications_created ON public.admin_internal_notifications USING btree (created_at DESC);
CREATE INDEX idx_audit_account ON public.audit_events USING btree (account_id);
CREATE INDEX idx_audit_action ON public.audit_events USING btree (action);
CREATE INDEX idx_audit_created ON public.audit_events USING btree (created_at);
CREATE INDEX idx_documents_files_created_at ON public.documents_files USING btree (created_at);
CREATE INDEX idx_documents_files_folder_id ON public.documents_files USING btree (folder_id);
CREATE INDEX idx_documents_folder_accounts_account_id ON public.documents_folder_accounts USING btree (account_id);
CREATE INDEX idx_documents_folders_account_id ON public.documents_folders USING btree (account_id);
CREATE INDEX idx_documents_folders_parent_id ON public.documents_folders USING btree (parent_id);
CREATE INDEX idx_documents_folders_sort_order ON public.documents_folders USING btree (sort_order);
CREATE INDEX idx_files_account ON public.files USING btree (account_id);
CREATE INDEX idx_files_owner ON public.files USING btree (owner_type, owner_id);
CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments USING btree (invoice_id);
CREATE INDEX idx_invoice_payment_submissions_account_id ON public.invoice_payment_submissions USING btree (account_id);
CREATE INDEX idx_invoice_payment_submissions_invoice_id ON public.invoice_payment_submissions USING btree (invoice_id);
CREATE INDEX idx_invoice_payment_submissions_status ON public.invoice_payment_submissions USING btree (status);
CREATE INDEX idx_invoices_order_kind ON public.invoices USING btree (order_id, invoice_kind);
CREATE INDEX idx_ivr_account ON public.ivr_requests USING btree (account_id);
CREATE INDEX idx_ivr_notes_ivr ON public.ivr_notes USING btree (ivr_id);
CREATE INDEX idx_ivr_requests_account_created ON public.ivr_requests USING btree (account_id, created_at DESC);
CREATE INDEX idx_ivr_status_events_ivr ON public.ivr_status_events USING btree (ivr_id);
CREATE INDEX idx_ivr_status ON public.ivr_requests USING btree (status);
CREATE INDEX idx_provider_clinical_discovery_answers_provider_id ON public.provider_clinical_discovery_answers USING btree (provider_id);
CREATE INDEX idx_provider_clinical_discovery_answers_source_case_id ON public.provider_clinical_discovery_answers USING btree (source_case_id) WHERE (source_case_id IS NOT NULL);
CREATE INDEX idx_provider_profiles_account ON public.account_provider_profiles USING btree (account_id);
CREATE INDEX idx_sales_activities_opportunity ON public.sales_activities USING btree (opportunity_id, activity_at DESC);
CREATE INDEX idx_sales_activities_owner_at ON public.sales_activities USING btree (owner_user_id, activity_at DESC);
CREATE INDEX idx_sales_command_document_files_folder ON public.sales_command_document_files USING btree (folder_id, sort_order, created_at DESC);
CREATE INDEX idx_sales_command_document_folders_parent ON public.sales_command_document_folders USING btree (parent_id, sort_order);
CREATE INDEX idx_sales_operational_notes_case ON public.sales_operational_notes USING btree (case_id, created_at DESC) WHERE (case_id IS NOT NULL);
CREATE INDEX idx_sales_operational_notes_created_at ON public.sales_operational_notes USING btree (created_at DESC);
CREATE INDEX idx_sales_operational_notes_entity ON public.sales_operational_notes USING btree (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_sales_operational_notes_provider ON public.sales_operational_notes USING btree (provider_id, created_at DESC) WHERE (provider_id IS NOT NULL);
CREATE INDEX idx_sales_opportunities_account_id ON public.sales_opportunities USING btree (account_id);
CREATE INDEX idx_sales_opportunities_additional_product_ids ON public.sales_opportunities USING gin (additional_product_ids);
CREATE INDEX idx_sales_opportunities_close_date ON public.sales_opportunities USING btree (close_date);
CREATE INDEX idx_sales_opportunities_owner ON public.sales_opportunities USING btree (owner_user_id);
CREATE INDEX idx_sales_opportunities_product_id ON public.sales_opportunities USING btree (product_id);
CREATE INDEX idx_sales_opportunities_source_case_id ON public.sales_opportunities USING btree (source_case_id) WHERE (source_case_id IS NOT NULL);
CREATE INDEX idx_sales_opportunities_source_engagement_id ON public.sales_opportunities USING btree (source_engagement_id) WHERE (source_engagement_id IS NOT NULL);
CREATE INDEX idx_sales_opportunities_stage ON public.sales_opportunities USING btree (stage);
CREATE INDEX idx_sales_opportunities_surgeon_contact_id ON public.sales_opportunities USING btree (surgeon_contact_id) WHERE (surgeon_contact_id IS NOT NULL);
CREATE INDEX idx_sales_organizations_archived ON public.sales_organizations USING btree (surgical_crm_archived_at) WHERE (surgical_crm_archived_at IS NULL);
CREATE INDEX idx_sales_organizations_linked_ordering_account ON public.sales_organizations USING btree (linked_ordering_account_id) WHERE (linked_ordering_account_id IS NOT NULL);
CREATE INDEX idx_sales_organizations_status ON public.sales_organizations USING btree (surgical_crm_status) WHERE (surgical_crm_status IS NOT NULL);
CREATE INDEX idx_sales_org_product_approvals_org ON public.sales_organization_product_approvals USING btree (organization_id, updated_at DESC);
CREATE INDEX idx_sales_org_product_approvals_status ON public.sales_organization_product_approvals USING btree (organization_id, status);
CREATE INDEX idx_sales_pre_call_plan_template_favorites_template ON public.sales_pre_call_plan_template_favorites USING btree (template_id);
CREATE INDEX idx_sales_pre_call_plan_templates_owner ON public.sales_pre_call_plan_templates USING btree (owner_user_id) WHERE (owner_user_id IS NOT NULL);
CREATE INDEX idx_sales_pre_call_plan_templates_product_type ON public.sales_pre_call_plan_templates USING btree (product_line, template_engagement_type);
CREATE INDEX idx_sales_pre_call_plan_templates_status ON public.sales_pre_call_plan_templates USING btree (status);
CREATE INDEX idx_sales_product_line_closed_line_year ON public.sales_product_line_closed USING btree (product_line, year, month, region);
CREATE INDEX idx_sales_product_line_quotas_line_year ON public.sales_product_line_quotas USING btree (product_line, year, month);
CREATE INDEX idx_sales_rep_time_off_requests_requester_created ON public.sales_rep_time_off_requests USING btree (requester_user_id, created_at DESC);
CREATE INDEX idx_sales_rep_time_off_requests_status_created ON public.sales_rep_time_off_requests USING btree (status, created_at DESC);
CREATE INDEX idx_sales_tasks_open ON public.sales_tasks USING btree (owner_user_id) WHERE (completed_at IS NULL);
CREATE INDEX idx_sales_tasks_opportunity ON public.sales_tasks USING btree (opportunity_id);
CREATE INDEX idx_sales_tasks_owner_due ON public.sales_tasks USING btree (owner_user_id, due_date);
CREATE INDEX idx_sspi_candidates_approved ON public.surgical_sales_product_intelligence_candidates USING btree (knowledge_type, product_id) WHERE (status = 'approved'::text);
CREATE INDEX idx_sspi_candidates_product_status ON public.surgical_sales_product_intelligence_candidates USING btree (product_id, status, knowledge_type, created_at DESC);
CREATE INDEX idx_sspi_documents_product ON public.surgical_sales_product_intelligence_documents USING btree (product_id, created_at DESC);
CREATE INDEX idx_sspi_runs_product ON public.surgical_sales_product_intelligence_runs USING btree (product_id, created_at DESC);
CREATE INDEX idx_surgical_sales_admin_audit_created_at ON public.surgical_sales_admin_audit_log USING btree (created_at DESC);
CREATE INDEX idx_surgical_sales_case_activities_case_id ON public.surgical_sales_case_activities USING btree (case_id, created_at DESC);
CREATE INDEX idx_surgical_sales_case_activities_user_id ON public.surgical_sales_case_activities USING btree (user_id);
CREATE INDEX idx_surgical_sales_case_documents_case_id ON public.surgical_sales_case_documents USING btree (case_id, created_at DESC);
CREATE INDEX idx_surgical_sales_case_documents_observation_form ON public.surgical_sales_case_documents USING btree (uploaded_by, created_at DESC) WHERE (document_type = 'observation_form'::text);
CREATE INDEX idx_surgical_sales_case_products_case_id ON public.surgical_sales_case_products USING btree (case_id);
CREATE INDEX idx_surgical_sales_case_products_product_id ON public.surgical_sales_case_products USING btree (product_id);
CREATE INDEX idx_surgical_sales_case_products_sku_id ON public.surgical_sales_case_products USING btree (sku_id) WHERE (sku_id IS NOT NULL);
CREATE INDEX idx_surgical_sales_cases_account_id ON public.surgical_sales_cases USING btree (account_id);
CREATE INDEX idx_surgical_sales_cases_archived_at ON public.surgical_sales_cases USING btree (archived_at) WHERE (archived_at IS NULL);
CREATE INDEX idx_surgical_sales_cases_billing_reviewed_at ON public.surgical_sales_cases USING btree (billing_reviewed_at) WHERE (billing_reviewed_at IS NOT NULL);
CREATE INDEX idx_surgical_sales_cases_case_date ON public.surgical_sales_cases USING btree (case_date);
CREATE INDEX idx_surgical_sales_cases_case_type ON public.surgical_sales_cases USING btree (case_type);
CREATE INDEX idx_surgical_sales_cases_product_id ON public.surgical_sales_cases USING btree (product_id);
CREATE INDEX idx_surgical_sales_cases_related_opportunity_id ON public.surgical_sales_cases USING btree (related_opportunity_id) WHERE (related_opportunity_id IS NOT NULL);
CREATE INDEX idx_surgical_sales_cases_sales_rep_id ON public.surgical_sales_cases USING btree (sales_rep_id);
CREATE INDEX idx_surgical_sales_cases_status ON public.surgical_sales_cases USING btree (status);
CREATE INDEX idx_surgical_sales_contact_orgs_account_active ON public.surgical_sales_contact_organizations USING btree (account_id, is_active);
CREATE INDEX idx_surgical_sales_contact_orgs_account ON public.surgical_sales_contact_organizations USING btree (account_id);
CREATE INDEX idx_surgical_sales_contact_orgs_contact ON public.surgical_sales_contact_organizations USING btree (contact_id);
CREATE INDEX idx_surgical_sales_contact_relationships_primary_contact_id ON public.surgical_sales_contact_relationships USING btree (primary_contact_id);
CREATE INDEX idx_surgical_sales_contact_relationships_related_contact_id ON public.surgical_sales_contact_relationships USING btree (related_contact_id);
CREATE INDEX idx_surgical_sales_contacts_account_active ON public.surgical_sales_contacts USING btree (account_id) WHERE (archived_at IS NULL);
CREATE INDEX idx_surgical_sales_contacts_account_id ON public.surgical_sales_contacts USING btree (account_id);
CREATE INDEX idx_surgical_sales_contacts_email ON public.surgical_sales_contacts USING btree (email) WHERE (email IS NOT NULL);
CREATE INDEX idx_surgical_sales_contacts_hidden_from_provider_directory ON public.surgical_sales_contacts USING btree (hidden_from_provider_directory_at) WHERE (hidden_from_provider_directory_at IS NOT NULL);
CREATE INDEX idx_surgical_sales_contacts_organization_id ON public.surgical_sales_contacts USING btree (organization_id);
CREATE INDEX idx_surgical_sales_contacts_role_type ON public.surgical_sales_contacts USING btree (role_type);
CREATE INDEX idx_surgical_sales_engagement_activities_engagement_id ON public.surgical_sales_engagement_activities USING btree (engagement_id, created_at DESC);
CREATE INDEX idx_surgical_sales_engagements_briefing_status ON public.surgical_sales_engagements USING btree (briefing_status) WHERE (archived_at IS NULL);
CREATE INDEX idx_surgical_sales_engagements_opportunity_id ON public.surgical_sales_engagements USING btree (opportunity_id) WHERE (opportunity_id IS NOT NULL);
CREATE INDEX idx_surgical_sales_engagements_organization_id ON public.surgical_sales_engagements USING btree (organization_id) WHERE (organization_id IS NOT NULL);
CREATE INDEX idx_surgical_sales_engagements_planning_mode ON public.surgical_sales_engagements USING btree (planning_mode) WHERE (archived_at IS NULL);
CREATE INDEX idx_surgical_sales_engagements_planning_status ON public.surgical_sales_engagements USING btree (planning_status) WHERE (archived_at IS NULL);
CREATE INDEX idx_surgical_sales_engagements_playbook_pathway_outcome ON public.surgical_sales_engagements USING btree (pre_call_plan_template_id) WHERE ((pre_call_plan_template_id IS NOT NULL) AND (completion_pathway_stage_before IS NOT NULL) AND (completion_pathway_stage_after IS NOT NULL));
CREATE INDEX idx_surgical_sales_engagements_pre_call_plan_template_id ON public.surgical_sales_engagements USING btree (pre_call_plan_template_id) WHERE (pre_call_plan_template_id IS NOT NULL);
CREATE INDEX idx_surgical_sales_engagements_prepared_at ON public.surgical_sales_engagements USING btree (prepared_at DESC NULLS LAST) WHERE (prepared_at IS NOT NULL);
CREATE INDEX idx_surgical_sales_engagements_provider_id ON public.surgical_sales_engagements USING btree (provider_id);
CREATE INDEX idx_surgical_sales_engagements_sales_rep_id ON public.surgical_sales_engagements USING btree (sales_rep_id);
CREATE INDEX idx_surgical_sales_engagements_scheduled_at ON public.surgical_sales_engagements USING btree (scheduled_at DESC NULLS LAST);
CREATE INDEX idx_surgical_sales_engagements_status ON public.surgical_sales_engagements USING btree (status);
CREATE INDEX idx_surgical_sales_phi_warning_case_id ON public.surgical_sales_phi_warning_events USING btree (case_id) WHERE (case_id IS NOT NULL);
CREATE INDEX idx_surgical_sales_phi_warning_created_at ON public.surgical_sales_phi_warning_events USING btree (created_at DESC);
CREATE INDEX idx_surgical_sales_products_active ON public.surgical_sales_products USING btree (active) WHERE (active = true);
CREATE INDEX idx_surgical_sales_product_skus_active ON public.surgical_sales_product_skus USING btree (active) WHERE (active = true);
CREATE INDEX idx_surgical_sales_product_skus_product_id ON public.surgical_sales_product_skus USING btree (product_id);
CREATE INDEX idx_surgical_sales_provider_activities_provider_id ON public.surgical_sales_provider_activities USING btree (provider_id, created_at DESC);
CREATE INDEX idx_surgical_sales_provider_activities_user_id ON public.surgical_sales_provider_activities USING btree (user_id);
CREATE INDEX idx_surgical_sales_rep_notifications_case ON public.surgical_sales_rep_notifications USING btree (case_id);
CREATE INDEX idx_surgical_sales_rep_notifications_user_created ON public.surgical_sales_rep_notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_unified_activity_events_created_at ON public.unified_activity_events USING btree (created_at DESC);
CREATE INDEX idx_unified_activity_events_entity ON public.unified_activity_events USING btree (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_unified_activity_events_type ON public.unified_activity_events USING btree (type, created_at DESC);
CREATE INDEX idx_universal_surgical_fact_captures_case ON public.universal_surgical_fact_captures USING btree (case_id, created_at DESC) WHERE (case_id IS NOT NULL);
CREATE INDEX idx_universal_surgical_fact_captures_encounter ON public.universal_surgical_fact_captures USING btree (encounter_id, created_at DESC) WHERE (encounter_id IS NOT NULL);
CREATE INDEX idx_universal_surgical_fact_captures_note ON public.universal_surgical_fact_captures USING btree (operational_note_id) WHERE (operational_note_id IS NOT NULL);
CREATE INDEX idx_universal_surgical_fact_captures_organization ON public.universal_surgical_fact_captures USING btree (organization_id, created_at DESC) WHERE (organization_id IS NOT NULL);
CREATE INDEX idx_universal_surgical_fact_captures_provider ON public.universal_surgical_fact_captures USING btree (provider_id, created_at DESC) WHERE (provider_id IS NOT NULL);
CREATE INDEX idx_universal_surgical_facts_capture ON public.universal_surgical_facts USING btree (capture_id);
CREATE INDEX idx_universal_surgical_facts_case ON public.universal_surgical_facts USING btree (case_id, created_at DESC) WHERE (case_id IS NOT NULL);
CREATE INDEX idx_universal_surgical_facts_concept ON public.universal_surgical_facts USING btree (concept, created_at DESC);
CREATE INDEX idx_universal_surgical_facts_encounter ON public.universal_surgical_facts USING btree (encounter_id, created_at DESC) WHERE (encounter_id IS NOT NULL);
CREATE INDEX idx_universal_surgical_facts_organization ON public.universal_surgical_facts USING btree (organization_id, created_at DESC) WHERE (organization_id IS NOT NULL);
CREATE INDEX idx_universal_surgical_facts_provider ON public.universal_surgical_facts USING btree (provider_id, created_at DESC) WHERE (provider_id IS NOT NULL);
CREATE INDEX inventory_movements_variant_id_created_at_idx ON public.inventory_movements USING btree (variant_id, created_at DESC);
CREATE INDEX invoice_items_invoice_id_sort_order_idx ON public.invoice_items USING btree (invoice_id, sort_order);
CREATE INDEX invoices_account_id_created_at_idx ON public.invoices USING btree (account_id, created_at DESC);
CREATE INDEX invoices_order_id_idx ON public.invoices USING btree (order_id);
CREATE INDEX invoices_paid_at_idx ON public.invoices USING btree (paid_at DESC);
CREATE INDEX ivr_audit_log_action_idx ON public.ivr_audit_log USING btree (action);
CREATE INDEX ivr_audit_log_actor_user_id_idx ON public.ivr_audit_log USING btree (actor_user_id, created_at DESC);
CREATE INDEX ivr_audit_log_ivr_request_id_idx ON public.ivr_audit_log USING btree (ivr_request_id, created_at DESC);
CREATE INDEX ivr_coverage_templates_active_idx ON public.ivr_coverage_templates USING btree (is_active);
CREATE INDEX ivr_coverage_templates_created_at_idx ON public.ivr_coverage_templates USING btree (created_at);
CREATE INDEX ivr_email_outbox_status_idx ON public.ivr_email_outbox USING btree (status);
CREATE INDEX ivr_email_outbox_type_idx ON public.ivr_email_outbox USING btree (type);
CREATE INDEX ivr_files_ivr_request_id_idx ON public.ivr_files USING btree (ivr_request_id, created_at DESC);
CREATE INDEX ivr_insurance_verifications_ivr_request_id_idx ON public.ivr_insurance_verifications USING btree (ivr_request_id);
CREATE INDEX ivr_requests_contact_id_idx ON public.ivr_requests USING btree (contact_id);
CREATE INDEX ivr_requests_ivr_identifier_idx ON public.ivr_requests USING btree (ivr_identifier);
CREATE INDEX ops_order_queue_order_idx ON public.ops_order_queue USING btree (order_id);
CREATE INDEX ops_order_queue_status_idx ON public.ops_order_queue USING btree (status, created_at DESC);
CREATE INDEX order_audit_log_created_at_idx ON public.order_audit_log USING btree (created_at DESC);
CREATE INDEX order_audit_log_order_id_created_at_idx ON public.order_audit_log USING btree (order_id, created_at DESC);
CREATE INDEX orders_created_by_user_id_idx ON public.orders USING btree (created_by_user_id);
CREATE INDEX orders_submitted_by_contact_id_idx ON public.orders USING btree (submitted_by_contact_id);
CREATE INDEX products_qcode_idx ON public.products USING btree (qcode);
CREATE INDEX product_variant_barcodes_active_idx ON public.product_variant_barcodes USING btree (is_active);
CREATE INDEX product_variant_barcodes_variant_id_idx ON public.product_variant_barcodes USING btree (variant_id);
CREATE INDEX product_variant_inventory_variant_id_idx ON public.product_variant_inventory USING btree (variant_id);
CREATE INDEX product_variant_lots_location_idx ON public.product_variant_lots USING btree (location);
CREATE INDEX product_variant_lots_variant_id_created_at_idx ON public.product_variant_lots USING btree (variant_id, created_at DESC);
CREATE INDEX sales_rep_manager_assignments_manager_idx ON public.sales_rep_manager_assignments USING btree (manager_user_id);
CREATE INDEX sales_rep_state_coverage_state_code_idx ON public.sales_rep_state_coverage USING btree (state_code);
CREATE INDEX surgical_sales_engagements_debrief_completed_idx ON public.surgical_sales_engagements USING btree (provider_id, debrief_completed) WHERE (archived_at IS NULL);
CREATE INDEX trace_events_fulfillment_id_idx ON public.trace_events USING btree (fulfillment_id, created_at DESC);
CREATE INDEX variant_identifiers_variant_id_idx ON public.variant_identifiers USING btree (variant_id);
CREATE INDEX variant_inventory_updated_at_idx ON public.variant_inventory USING btree (updated_at DESC);
CREATE UNIQUE INDEX account_addresses_one_default_per_kind ON public.account_addresses USING btree (account_id, kind) WHERE ((is_default = true) AND (disabled_at IS NULL));
CREATE UNIQUE INDEX account_contacts_account_email_uq ON public.account_contacts USING btree (account_id, lower(email));
CREATE UNIQUE INDEX account_invites_token_unique ON public.account_invites USING btree (invite_token);
CREATE UNIQUE INDEX account_portal_people_account_email_uniq ON public.account_portal_people USING btree (account_id, lower(email));
CREATE UNIQUE INDEX account_users_unique ON public.account_users USING btree (account_id, user_id);
CREATE UNIQUE INDEX admin_internal_notifications_dedupe_key_unique ON public.admin_internal_notifications USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL);
CREATE UNIQUE INDEX fulfillment_item_trace_unique_serial ON public.fulfillment_item_trace USING btree (serial_number) WHERE ((serial_number IS NOT NULL) AND (serial_number <> ''::text));
CREATE UNIQUE INDEX fulfillments_one_open_per_order_source ON public.fulfillments USING btree (order_id, fulfillment_source) WHERE (status = 'OPEN'::text);
CREATE UNIQUE INDEX idx_accounts_stripe_customer_id ON public.accounts USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);
CREATE UNIQUE INDEX idx_provider_profiles_one_default_per_account ON public.account_provider_profiles USING btree (account_id) WHERE (is_default = true);
CREATE UNIQUE INDEX idx_surgical_sales_cases_engagement_id ON public.surgical_sales_cases USING btree (engagement_id) WHERE (engagement_id IS NOT NULL);
CREATE UNIQUE INDEX inventory_locations_name_lower ON public.inventory_locations USING btree (lower(TRIM(BOTH FROM name)));
CREATE UNIQUE INDEX invoice_items_invoice_id_order_item_id_unique ON public.invoice_items USING btree (invoice_id, order_item_id) WHERE (order_item_id IS NOT NULL);
CREATE UNIQUE INDEX invoices_one_primary_per_order ON public.invoices USING btree (order_id) WHERE (invoice_kind = 'PRIMARY'::text);
CREATE UNIQUE INDEX surgical_sales_products_name_unique ON public.surgical_sales_products USING btree (lower(TRIM(BOTH FROM name)));
CREATE UNIQUE INDEX surgical_sales_rep_notifications_dedupe_key_unique ON public.surgical_sales_rep_notifications USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL);
CREATE UNIQUE INDEX uq_surgical_sales_contact_orgs_primary ON public.surgical_sales_contact_organizations USING btree (contact_id) WHERE (is_primary_org = true);
CREATE UNIQUE INDEX uq_surgical_sales_contact_relationships_pair_type ON public.surgical_sales_contact_relationships USING btree (primary_contact_id, related_contact_id, relationship_type);
CREATE UNIQUE INDEX variant_identifiers_kind_value_unique ON public.variant_identifiers USING btree (kind, value);

CREATE VIEW public."account_contacts_with_ivr_counts" AS SELECT ac.id,
    ac.account_id,
    ac.full_name,
    ac.email,
    ac.created_at,
    ac.is_primary,
    (COALESCE(ivr_cnt.cnt, (0)::bigint))::integer AS ivr_count
   FROM (public.account_contacts ac
     LEFT JOIN LATERAL ( SELECT count(*) AS cnt
           FROM public.ivr_requests ivr
          WHERE (ivr.contact_id = ac.id)) ivr_cnt ON (true));

CREATE TRIGGER surgical_sales_cases_set_case_number BEFORE INSERT ON public.surgical_sales_cases FOR EACH ROW EXECUTE FUNCTION public.surgical_sales_set_case_number();
CREATE TRIGGER surgical_sales_contacts_sync_legacy_columns BEFORE INSERT OR UPDATE ON public.surgical_sales_contacts FOR EACH ROW EXECUTE FUNCTION public.surgical_sales_contacts_sync_legacy_columns();
CREATE TRIGGER trg_touch_surgical_sales_contact_orgs_updated_at BEFORE UPDATE ON public.surgical_sales_contact_organizations FOR EACH ROW EXECUTE FUNCTION public.touch_surgical_sales_contact_orgs_updated_at();
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public."account_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_portal_people" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_pricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_provider_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_virtual_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_vw_delivery_slips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_internal_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."documents_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."documents_folder_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."documents_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."dropship_vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."execution_leaderboard_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fulfillment_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fulfillment_item_trace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fulfillment_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fulfillment_picks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fulfillments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."internal_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."inventory_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoice_payment_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoice_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ivr_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ivr_coverage_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ivr_email_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ivr_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ivr_insurance_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ivr_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ivr_phi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ivr_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ivr_status_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ops_order_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order_status_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."product_variant_barcodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."product_variant_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."product_variant_lots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."product_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_clinical_discovery_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_command_document_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_command_document_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_operational_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_opportunities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_organization_product_approvals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_pre_call_plan_template_favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_pre_call_plan_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_product_line_closed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_product_line_quotas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_rep_manager_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_rep_state_coverage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_rep_time_off_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."staff_user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_case_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_case_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_case_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_engagement_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_engagements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_phi_warning_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_product_intelligence_candidates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_product_intelligence_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_product_intelligence_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_product_skus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_provider_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."surgical_sales_rep_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."trace_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."unified_activity_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."universal_surgical_fact_captures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."universal_surgical_facts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."variant_identifiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."variant_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."virtual_warehouse_credit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."virtual_warehouse_ship_debits" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_addresses_select_authenticated" ON public."account_addresses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL))))));

CREATE POLICY "account_contacts_select_authenticated" ON public."account_contacts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL))))));

CREATE POLICY "account_pricing_select_authenticated" ON public."account_pricing" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL))))));

CREATE POLICY "account_provider_profiles_select_authenticated" ON public."account_provider_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL))))));

CREATE POLICY "account_users_select_authenticated" ON public."account_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (user_id = ( SELECT uid() AS uid))));

CREATE POLICY "accounts_select_authenticated" ON public."accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL))))));

CREATE POLICY "admin_internal_notifications_select" ON public."admin_internal_notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "Admin or staff can delete documents_files" ON public."documents_files" AS PERMISSIVE FOR DELETE TO "authenticated" USING (( SELECT private.is_admin_or_staff() AS is_admin_or_staff));

CREATE POLICY "Admin or staff can insert documents_files" ON public."documents_files" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (( SELECT private.is_admin_or_staff() AS is_admin_or_staff));

CREATE POLICY "documents_files_select_authenticated" ON public."documents_files" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (folder_id IN ( SELECT documents_folders.id
   FROM documents_folders
  WHERE ((documents_folders.share_mode = 'all'::documents_share_mode) OR ((documents_folders.share_mode = 'selected'::documents_share_mode) AND ((documents_folders.account_id IN ( SELECT account_users.account_id
           FROM account_users
          WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL)))) OR (documents_folders.id IN ( SELECT documents_folder_accounts.folder_id
           FROM documents_folder_accounts
          WHERE (documents_folder_accounts.account_id IN ( SELECT account_users.account_id
                   FROM account_users
                  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL)))))))))))));

CREATE POLICY "documents_folder_accounts_delete_authenticated" ON public."documents_folder_accounts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (( SELECT private.is_admin_or_staff() AS is_admin_or_staff));

CREATE POLICY "documents_folder_accounts_insert_authenticated" ON public."documents_folder_accounts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (( SELECT private.is_admin_or_staff() AS is_admin_or_staff));

CREATE POLICY "documents_folder_accounts_select_authenticated" ON public."documents_folder_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL))))));

CREATE POLICY "Admin or staff can delete documents_folders" ON public."documents_folders" AS PERMISSIVE FOR DELETE TO "authenticated" USING (( SELECT private.is_admin_or_staff() AS is_admin_or_staff));

CREATE POLICY "Admin or staff can insert documents_folders" ON public."documents_folders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (( SELECT private.is_admin_or_staff() AS is_admin_or_staff));

CREATE POLICY "Admin or staff can update documents_folders" ON public."documents_folders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (( SELECT private.is_admin_or_staff() AS is_admin_or_staff));

CREATE POLICY "documents_folders_select_authenticated" ON public."documents_folders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR ((share_mode = 'all'::documents_share_mode) OR ((share_mode = 'selected'::documents_share_mode) AND ((account_id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL)))) OR (id IN ( SELECT documents_folder_accounts.folder_id
   FROM documents_folder_accounts
  WHERE (documents_folder_accounts.account_id IN ( SELECT account_users.account_id
           FROM account_users
          WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL)))))))))));

CREATE POLICY "execution_leaderboard_settings_select_admin" ON public."execution_leaderboard_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "execution_leaderboard_settings_update_admin" ON public."execution_leaderboard_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))) WITH CHECK ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "internal_users_select_own" ON public."internal_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT uid() AS uid)));

CREATE POLICY "ivr_requests_select_authenticated" ON public."ivr_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL))))));

CREATE POLICY "order_items_insert_authenticated" ON public."order_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.account_id IN ( SELECT account_users.account_id
           FROM account_users
          WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL)))))))));

CREATE POLICY "order_items_select_authenticated" ON public."order_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.account_id IN ( SELECT account_users.account_id
           FROM account_users
          WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL)))))))));

CREATE POLICY "order_status_events_select_authenticated" ON public."order_status_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_status_events.order_id) AND (o.account_id IN ( SELECT account_users.account_id
           FROM account_users
          WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL)))))))));

CREATE POLICY "orders_insert_authenticated" ON public."orders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL))))));

CREATE POLICY "orders_select_authenticated" ON public."orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT account_users.account_id
   FROM account_users
  WHERE ((account_users.user_id = ( SELECT uid() AS uid)) AND (account_users.disabled_at IS NULL))))));

CREATE POLICY "variants_read_authenticated" ON public."product_variants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "products_read_authenticated" ON public."products" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "provider_clinical_discovery_answers_delete" ON public."provider_clinical_discovery_answers" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "provider_clinical_discovery_answers_insert" ON public."provider_clinical_discovery_answers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR (EXISTS ( SELECT 1
   FROM surgical_sales_contacts c
  WHERE ((c.id = provider_clinical_discovery_answers.provider_id) AND (c.account_id IN ( SELECT m.account_id
           FROM account_users m
          WHERE ((m.user_id = ( SELECT uid() AS uid)) AND (m.disabled_at IS NULL)))))))));

CREATE POLICY "provider_clinical_discovery_answers_select" ON public."provider_clinical_discovery_answers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR (EXISTS ( SELECT 1
   FROM surgical_sales_contacts c
  WHERE ((c.id = provider_clinical_discovery_answers.provider_id) AND (c.account_id IN ( SELECT m.account_id
           FROM account_users m
          WHERE ((m.user_id = ( SELECT uid() AS uid)) AND (m.disabled_at IS NULL)))))))));

CREATE POLICY "provider_clinical_discovery_answers_update" ON public."provider_clinical_discovery_answers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR (EXISTS ( SELECT 1
   FROM surgical_sales_contacts c
  WHERE ((c.id = provider_clinical_discovery_answers.provider_id) AND (c.account_id IN ( SELECT m.account_id
           FROM account_users m
          WHERE ((m.user_id = ( SELECT uid() AS uid)) AND (m.disabled_at IS NULL)))))))));

CREATE POLICY "sales_activities_delete" ON public."sales_activities" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM sales_opportunities o
  WHERE ((o.id = sales_activities.opportunity_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
           FROM internal_users i
          WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true)))))))));

CREATE POLICY "sales_activities_insert" ON public."sales_activities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM sales_opportunities o
  WHERE ((o.id = sales_activities.opportunity_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
           FROM internal_users i
          WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true)))))))) AND (owner_user_id = ( SELECT uid() AS uid))));

CREATE POLICY "sales_activities_select" ON public."sales_activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM sales_opportunities o
  WHERE ((o.id = sales_activities.opportunity_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
           FROM internal_users i
          WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true)))))))));

CREATE POLICY "sales_activities_update" ON public."sales_activities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM sales_opportunities o
  WHERE ((o.id = sales_activities.opportunity_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
           FROM internal_users i
          WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true)))))))));

CREATE POLICY "sales_command_document_files_rep_select" ON public."sales_command_document_files" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((folder_id IN ( SELECT f.id
   FROM sales_command_document_folders f
  WHERE (((f.access_level = 'all_reps'::sales_command_document_access) AND (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_internal_sales_rep = true))))) OR ((f.access_level = 'territory_managers'::sales_command_document_access) AND (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_territory_manager = true)))))))));

CREATE POLICY "sales_command_document_folders_rep_select" ON public."sales_command_document_folders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((((access_level = 'all_reps'::sales_command_document_access) AND (EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_internal_sales_rep = true))))) OR ((access_level = 'territory_managers'::sales_command_document_access) AND (EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_territory_manager = true)))))));

CREATE POLICY "sales_operational_notes_insert" ON public."sales_operational_notes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((created_by_user_id = uid()));

CREATE POLICY "sales_operational_notes_select" ON public."sales_operational_notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "sales_operational_notes_service" ON public."sales_operational_notes" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "sales_opportunities_delete" ON public."sales_opportunities" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
   FROM internal_users i
  WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true))))));

CREATE POLICY "sales_opportunities_insert" ON public."sales_opportunities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((((owner_user_id = ( SELECT uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_internal_sales_rep = true))))) OR (EXISTS ( SELECT 1
   FROM internal_users i
  WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true))))));

CREATE POLICY "sales_opportunities_select" ON public."sales_opportunities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
   FROM internal_users i
  WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true))))));

CREATE POLICY "sales_opportunities_update" ON public."sales_opportunities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
   FROM internal_users i
  WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true)))))) WITH CHECK ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
   FROM internal_users i
  WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM user_profiles p
  WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true))))));

CREATE POLICY "sales_org_product_approvals_delete" ON public."sales_organization_product_approvals" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)));

CREATE POLICY "sales_org_product_approvals_insert" ON public."sales_organization_product_approvals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) AND (created_by_user_id = ( SELECT uid() AS uid))) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin)));

CREATE POLICY "sales_org_product_approvals_select" ON public."sales_organization_product_approvals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)));

CREATE POLICY "sales_org_product_approvals_update" ON public."sales_organization_product_approvals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep))) WITH CHECK ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)));

CREATE POLICY "sales_pre_call_plan_template_favorites_delete" ON public."sales_pre_call_plan_template_favorites" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((user_id = ( SELECT uid() AS uid)));

CREATE POLICY "sales_pre_call_plan_template_favorites_insert" ON public."sales_pre_call_plan_template_favorites" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT uid() AS uid)));

CREATE POLICY "sales_pre_call_plan_template_favorites_select" ON public."sales_pre_call_plan_template_favorites" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT uid() AS uid)));

CREATE POLICY "sales_pre_call_plan_templates_delete" ON public."sales_pre_call_plan_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((is_system = false) AND (owner_user_id = ( SELECT uid() AS uid)) AND ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)));

CREATE POLICY "sales_pre_call_plan_templates_delete_admin" ON public."sales_pre_call_plan_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((is_system = false) AND (( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))));

CREATE POLICY "sales_pre_call_plan_templates_insert" ON public."sales_pre_call_plan_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((is_system = false) AND (owner_user_id = ( SELECT uid() AS uid)) AND ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)));

CREATE POLICY "sales_pre_call_plan_templates_select" ON public."sales_pre_call_plan_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((is_system = true) OR (owner_user_id = ( SELECT uid() AS uid)) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "sales_pre_call_plan_templates_update" ON public."sales_pre_call_plan_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((is_system = false) AND (owner_user_id = ( SELECT uid() AS uid)) AND ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep))) WITH CHECK (((is_system = false) AND (owner_user_id = ( SELECT uid() AS uid))));

CREATE POLICY "sales_pre_call_plan_templates_update_admin" ON public."sales_pre_call_plan_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((is_system = false) AND (( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)))) WITH CHECK ((is_system = false));

CREATE POLICY "sales_pre_call_plan_templates_update_system_admin" ON public."sales_pre_call_plan_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((is_system = true) AND (( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)))) WITH CHECK ((is_system = true));

CREATE POLICY "sales_product_line_closed_select" ON public."sales_product_line_closed" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin));

CREATE POLICY "sales_product_line_quotas_select" ON public."sales_product_line_quotas" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin));

CREATE POLICY "sales_rep_manager_assignments_admin_write" ON public."sales_rep_manager_assignments" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM internal_users iu
  WHERE (iu.user_id = ( SELECT uid() AS uid))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM internal_users iu
  WHERE (iu.user_id = ( SELECT uid() AS uid)))));

CREATE POLICY "sales_rep_manager_assignments_select_authenticated" ON public."sales_rep_manager_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "sales_rep_state_coverage_admin_write" ON public."sales_rep_state_coverage" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM internal_users iu
  WHERE (iu.user_id = ( SELECT uid() AS uid))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM internal_users iu
  WHERE (iu.user_id = ( SELECT uid() AS uid)))));

CREATE POLICY "sales_rep_state_coverage_select_authenticated" ON public."sales_rep_state_coverage" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "sales_rep_time_off_requests_select" ON public."sales_rep_time_off_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((requester_user_id = ( SELECT uid() AS uid)) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "sales_tasks_delete" ON public."sales_tasks" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM sales_opportunities o
  WHERE ((o.id = sales_tasks.opportunity_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
           FROM internal_users i
          WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true)))))))));

CREATE POLICY "sales_tasks_insert" ON public."sales_tasks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM sales_opportunities o
  WHERE ((o.id = sales_tasks.opportunity_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
           FROM internal_users i
          WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true)))))))) AND (owner_user_id = ( SELECT uid() AS uid))));

CREATE POLICY "sales_tasks_select" ON public."sales_tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM sales_opportunities o
  WHERE ((o.id = sales_tasks.opportunity_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
           FROM internal_users i
          WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true)))))))));

CREATE POLICY "sales_tasks_update" ON public."sales_tasks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM sales_opportunities o
  WHERE ((o.id = sales_tasks.opportunity_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR (EXISTS ( SELECT 1
           FROM internal_users i
          WHERE (i.user_id = ( SELECT uid() AS uid)))) OR (EXISTS ( SELECT 1
           FROM user_profiles p
          WHERE ((p.user_id = ( SELECT uid() AS uid)) AND (p.is_admin = true)))))))));

CREATE POLICY "surgical_sales_case_activities_delete" ON public."surgical_sales_case_activities" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_activities.case_id) AND ((c.sales_rep_id = ( SELECT uid() AS uid)) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_activities_insert" ON public."surgical_sales_case_activities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_activities.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_activities_select" ON public."surgical_sales_case_activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_activities.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_activities_update" ON public."surgical_sales_case_activities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_activities.case_id) AND ((c.sales_rep_id = ( SELECT uid() AS uid)) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_documents_delete" ON public."surgical_sales_case_documents" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_documents.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_documents_insert" ON public."surgical_sales_case_documents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_documents.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_documents_select" ON public."surgical_sales_case_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_documents.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_documents_update" ON public."surgical_sales_case_documents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_documents.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_products_delete" ON public."surgical_sales_case_products" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_products.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_products_insert" ON public."surgical_sales_case_products" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_products.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_products_select" ON public."surgical_sales_case_products" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_products.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_case_products_update" ON public."surgical_sales_case_products" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_cases c
  WHERE ((c.id = surgical_sales_case_products.case_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_cases_delete" ON public."surgical_sales_cases" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_cases_insert" ON public."surgical_sales_cases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((((sales_rep_id = ( SELECT uid() AS uid)) AND ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_cases_select" ON public."surgical_sales_cases" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_cases_update" ON public."surgical_sales_cases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))) WITH CHECK ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_contacts_delete" ON public."surgical_sales_contacts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_contacts_insert" ON public."surgical_sales_contacts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT m.account_id
   FROM account_users m
  WHERE ((m.user_id = ( SELECT uid() AS uid)) AND (m.disabled_at IS NULL)))) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)));

CREATE POLICY "surgical_sales_contacts_select" ON public."surgical_sales_contacts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR (account_id IN ( SELECT m.account_id
   FROM account_users m
  WHERE ((m.user_id = ( SELECT uid() AS uid)) AND (m.disabled_at IS NULL))))));

CREATE POLICY "surgical_sales_contacts_update" ON public."surgical_sales_contacts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (account_id IN ( SELECT m.account_id
   FROM account_users m
  WHERE ((m.user_id = ( SELECT uid() AS uid)) AND (m.disabled_at IS NULL)))) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)));

CREATE POLICY "surgical_sales_engagement_activities_insert" ON public."surgical_sales_engagement_activities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM surgical_sales_engagements e
  WHERE ((e.id = surgical_sales_engagement_activities.engagement_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_engagement_activities_select" ON public."surgical_sales_engagement_activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM surgical_sales_engagements e
  WHERE ((e.id = surgical_sales_engagement_activities.engagement_id) AND (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))))));

CREATE POLICY "surgical_sales_engagements_insert" ON public."surgical_sales_engagements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((((sales_rep_id = ( SELECT uid() AS uid)) AND ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_engagements_select" ON public."surgical_sales_engagements" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_engagements_update" ON public."surgical_sales_engagements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))) WITH CHECK ((( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "sspi_candidates_authenticated_select" ON public."surgical_sales_product_intelligence_candidates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "sspi_candidates_service" ON public."surgical_sales_product_intelligence_candidates" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "sspi_documents_authenticated_select" ON public."surgical_sales_product_intelligence_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "sspi_documents_service" ON public."surgical_sales_product_intelligence_documents" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "sspi_runs_authenticated_select" ON public."surgical_sales_product_intelligence_runs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "sspi_runs_service" ON public."surgical_sales_product_intelligence_runs" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "surgical_sales_product_skus_delete" ON public."surgical_sales_product_skus" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_product_skus_insert" ON public."surgical_sales_product_skus" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_product_skus_select" ON public."surgical_sales_product_skus" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR (EXISTS ( SELECT 1
   FROM account_users m
  WHERE ((m.user_id = ( SELECT uid() AS uid)) AND (m.disabled_at IS NULL))))));

CREATE POLICY "surgical_sales_product_skus_update" ON public."surgical_sales_product_skus" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))) WITH CHECK ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_products_delete" ON public."surgical_sales_products" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_products_insert" ON public."surgical_sales_products" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_products_select" ON public."surgical_sales_products" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) OR (EXISTS ( SELECT 1
   FROM account_users m
  WHERE ((m.user_id = ( SELECT uid() AS uid)) AND (m.disabled_at IS NULL))))));

CREATE POLICY "surgical_sales_products_update" ON public."surgical_sales_products" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff))) WITH CHECK ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_provider_activities_delete" ON public."surgical_sales_provider_activities" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "surgical_sales_provider_activities_insert" ON public."surgical_sales_provider_activities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep) AND (user_id = ( SELECT uid() AS uid)))));

CREATE POLICY "surgical_sales_provider_activities_select" ON public."surgical_sales_provider_activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)));

CREATE POLICY "surgical_sales_provider_activities_update" ON public."surgical_sales_provider_activities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR ( SELECT surgical_sales_is_internal_sales_rep() AS surgical_sales_is_internal_sales_rep)));

CREATE POLICY "surgical_sales_rep_notifications_select" ON public."surgical_sales_rep_notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = ( SELECT uid() AS uid)) OR ( SELECT surgical_sales_is_internal_portal_admin() AS surgical_sales_is_internal_portal_admin) OR ( SELECT private.is_admin_or_staff() AS is_admin_or_staff)));

CREATE POLICY "unified_activity_events_insert" ON public."unified_activity_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((created_by_user_id = uid()));

CREATE POLICY "unified_activity_events_select" ON public."unified_activity_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "unified_activity_events_service" ON public."unified_activity_events" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "universal_surgical_fact_captures_insert" ON public."universal_surgical_fact_captures" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((created_by_user_id = uid()));

CREATE POLICY "universal_surgical_fact_captures_select" ON public."universal_surgical_fact_captures" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "universal_surgical_fact_captures_service" ON public."universal_surgical_fact_captures" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "universal_surgical_facts_insert" ON public."universal_surgical_facts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "universal_surgical_facts_select" ON public."universal_surgical_facts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "universal_surgical_facts_service" ON public."universal_surgical_facts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "user_profiles_insert_authenticated" ON public."user_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT uid() AS uid)));

CREATE POLICY "user_profiles_select_authenticated" ON public."user_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.is_admin_or_staff() AS is_admin_or_staff) OR (user_id = ( SELECT uid() AS uid))));

CREATE POLICY "user_profiles_update_authenticated" ON public."user_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = ( SELECT uid() AS uid))) WITH CHECK ((user_id = ( SELECT uid() AS uid)));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_addresses" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_addresses" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_addresses" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_contacts" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_contacts" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_contacts" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_contacts_with_ivr_counts" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_contacts_with_ivr_counts" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_contacts_with_ivr_counts" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_invites" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_invites" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_invites" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_portal_people" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_portal_people" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_portal_people" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_pricing" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_pricing" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_pricing" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_provider_profiles" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_provider_profiles" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_provider_profiles" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_users" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_users" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_users" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_virtual_inventory" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_virtual_inventory" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_virtual_inventory" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_vw_delivery_slips" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_vw_delivery_slips" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."account_vw_delivery_slips" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."accounts" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."accounts" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."accounts" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."admin_audit_log" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."admin_audit_log" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."admin_audit_log" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."admin_internal_notifications" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."admin_internal_notifications" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."admin_internal_notifications" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."audit_events" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."audit_events" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."audit_events" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."credentialing_platforms" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."credentialing_platforms" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."credentialing_platforms" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."documents_files" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."documents_files" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."documents_files" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."documents_folder_accounts" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."documents_folder_accounts" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."documents_folder_accounts" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."documents_folders" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."documents_folders" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."documents_folders" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."dropship_vendors" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."dropship_vendors" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."dropship_vendors" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."execution_leaderboard_settings" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."execution_leaderboard_settings" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."execution_leaderboard_settings" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."files" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."files" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."files" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_files" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_files" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_files" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_item_trace" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_item_trace" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_item_trace" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_items" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_items" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_items" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_picks" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_picks" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillment_picks" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillments" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillments" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."fulfillments" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."internal_users" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."internal_users" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."internal_users" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."inventory_locations" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."inventory_locations" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."inventory_locations" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."inventory_movements" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."inventory_movements" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."inventory_movements" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoice_items" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoice_items" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoice_items" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoice_payment_submissions" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoice_payment_submissions" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoice_payment_submissions" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoice_payments" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoice_payments" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoice_payments" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoices" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoices" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."invoices" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_audit_log" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_audit_log" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_audit_log" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_coverage_templates" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_coverage_templates" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_coverage_templates" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_email_outbox" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_email_outbox" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_email_outbox" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_files" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_files" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_files" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_insurance_verifications" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_insurance_verifications" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_insurance_verifications" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_notes" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_notes" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_notes" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_phi" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_phi" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_phi" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_requests" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_requests" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_requests" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_status_events" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_status_events" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ivr_status_events" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ops_order_queue" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ops_order_queue" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ops_order_queue" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_audit_log" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_audit_log" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_audit_log" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_items" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_items" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_items" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_status_events" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_status_events" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_status_events" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."orders" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."orders" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."orders" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variant_barcodes" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variant_barcodes" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variant_barcodes" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variant_inventory" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variant_inventory" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variant_inventory" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variant_lots" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variant_lots" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variant_lots" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variants" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variants" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."product_variants" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."products" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."products" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."products" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."provider_clinical_discovery_answers" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."provider_clinical_discovery_answers" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."provider_clinical_discovery_answers" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_activities" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_activities" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_activities" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_command_document_files" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_command_document_files" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_command_document_files" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_command_document_folders" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_command_document_folders" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_command_document_folders" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_operational_notes" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_operational_notes" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_operational_notes" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_opportunities" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_opportunities" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_opportunities" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_organization_product_approvals" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_organization_product_approvals" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_organization_product_approvals" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_organizations" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_organizations" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_organizations" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_pre_call_plan_template_favorites" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_pre_call_plan_template_favorites" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_pre_call_plan_template_favorites" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_pre_call_plan_templates" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_pre_call_plan_templates" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_pre_call_plan_templates" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_product_line_closed" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_product_line_closed" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_product_line_closed" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_product_line_quotas" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_product_line_quotas" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_product_line_quotas" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_rep_manager_assignments" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_rep_manager_assignments" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_rep_manager_assignments" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_rep_state_coverage" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_rep_state_coverage" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_rep_state_coverage" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_rep_time_off_requests" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_rep_time_off_requests" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_rep_time_off_requests" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_tasks" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_tasks" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."sales_tasks" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."staff_user_roles" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."staff_user_roles" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."staff_user_roles" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_admin_audit_log" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_admin_audit_log" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_admin_audit_log" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_case_activities" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_case_activities" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_case_activities" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_case_documents" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_case_documents" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_case_documents" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_case_products" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_case_products" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_case_products" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_cases" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_cases" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_cases" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_contact_organizations" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_contact_organizations" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_contact_organizations" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_contact_relationships" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_contact_relationships" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_contact_relationships" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_contacts" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_contacts" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_contacts" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_engagement_activities" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_engagement_activities" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_engagement_activities" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_engagements" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_engagements" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_engagements" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_phi_warning_events" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_phi_warning_events" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_phi_warning_events" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_intelligence_candidates" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_intelligence_candidates" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_intelligence_candidates" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_intelligence_documents" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_intelligence_documents" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_intelligence_documents" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_intelligence_runs" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_intelligence_runs" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_intelligence_runs" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_skus" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_skus" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_product_skus" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_products" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_products" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_products" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_provider_activities" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_provider_activities" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_provider_activities" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_rep_notifications" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_rep_notifications" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."surgical_sales_rep_notifications" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."trace_events" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."trace_events" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."trace_events" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."unified_activity_events" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."unified_activity_events" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."unified_activity_events" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."universal_surgical_fact_captures" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."universal_surgical_fact_captures" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."universal_surgical_fact_captures" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."universal_surgical_facts" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."universal_surgical_facts" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."universal_surgical_facts" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."user_profiles" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."user_profiles" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."user_profiles" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."variant_identifiers" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."variant_identifiers" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."variant_identifiers" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."variant_inventory" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."variant_inventory" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."variant_inventory" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."virtual_warehouse_credit_events" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."virtual_warehouse_credit_events" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."virtual_warehouse_credit_events" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."virtual_warehouse_ship_debits" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."virtual_warehouse_ship_debits" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."virtual_warehouse_ship_debits" TO "service_role";
GRANT EXECUTE ON FUNCTION fulfillment_pick(uuid,numeric,uuid,inet,text,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION fulfillment_pick(uuid,numeric,uuid,inet,text,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION fulfillment_pick(uuid,numeric,uuid,inet,text,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION increment_virtual_sqcm_balance(uuid,numeric) TO "anon";
GRANT EXECUTE ON FUNCTION increment_virtual_sqcm_balance(uuid,numeric) TO "authenticated";
GRANT EXECUTE ON FUNCTION increment_virtual_sqcm_balance(uuid,numeric) TO "service_role";
GRANT EXECUTE ON FUNCTION set_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION set_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION set_updated_at() TO "service_role";
GRANT EXECUTE ON FUNCTION surgical_sales_contacts_sync_legacy_columns() TO "anon";
GRANT EXECUTE ON FUNCTION surgical_sales_contacts_sync_legacy_columns() TO "authenticated";
GRANT EXECUTE ON FUNCTION surgical_sales_contacts_sync_legacy_columns() TO "service_role";
GRANT EXECUTE ON FUNCTION surgical_sales_is_internal_portal_admin() TO "anon";
GRANT EXECUTE ON FUNCTION surgical_sales_is_internal_portal_admin() TO "authenticated";
GRANT EXECUTE ON FUNCTION surgical_sales_is_internal_portal_admin() TO "service_role";
GRANT EXECUTE ON FUNCTION surgical_sales_is_internal_sales_rep() TO "anon";
GRANT EXECUTE ON FUNCTION surgical_sales_is_internal_sales_rep() TO "authenticated";
GRANT EXECUTE ON FUNCTION surgical_sales_is_internal_sales_rep() TO "service_role";
GRANT EXECUTE ON FUNCTION surgical_sales_set_case_number() TO "anon";
GRANT EXECUTE ON FUNCTION surgical_sales_set_case_number() TO "authenticated";
GRANT EXECUTE ON FUNCTION surgical_sales_set_case_number() TO "service_role";
GRANT EXECUTE ON FUNCTION touch_surgical_sales_contact_orgs_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION touch_surgical_sales_contact_orgs_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION touch_surgical_sales_contact_orgs_updated_at() TO "service_role";
GRANT EXECUTE ON FUNCTION try_subtract_virtual_sqcm_balance(uuid,numeric) TO "anon";
GRANT EXECUTE ON FUNCTION try_subtract_virtual_sqcm_balance(uuid,numeric) TO "authenticated";
GRANT EXECUTE ON FUNCTION try_subtract_virtual_sqcm_balance(uuid,numeric) TO "service_role";
