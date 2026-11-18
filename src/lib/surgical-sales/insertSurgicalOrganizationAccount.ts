import {
  SALES_ORGANIZATION_COLUMNS,
  SALES_ORGANIZATIONS_TABLE,
} from "@/lib/surgical-sales/salesOrganizationTable";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type InsertSurgicalOrganizationParams = {
  name: string;
  discount_percent: number;
  surgical_crm_type: string | null;
  surgical_crm_billing_address: string | null;
  surgical_crm_shipping_address: string | null;
  surgical_crm_phone: string | null;
  surgical_crm_website: string | null;
  surgical_crm_status: string | null;
  surgical_crm_notes: string | null;
  surgical_crm_billing_city: string | null;
  surgical_crm_billing_state: string | null;
  surgical_crm_billing_postal_code: string | null;
  surgical_crm_created_by: string | null;
};

export type InsertSurgicalOrganizationResult =
  | { ok: true; organization: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Inserts a Sales Command organization row. Does not create ordering customer accounts or pricing.
 */
export async function insertSurgicalOrganizationAccount(
  params: InsertSurgicalOrganizationParams,
): Promise<InsertSurgicalOrganizationResult> {
  const now = new Date().toISOString();

  const insertRow: Record<string, unknown> = {
    name: params.name.trim(),
    discount_percent: params.discount_percent,
    surgical_crm_type: params.surgical_crm_type,
    surgical_crm_billing_address: params.surgical_crm_billing_address,
    surgical_crm_shipping_address: params.surgical_crm_shipping_address,
    surgical_crm_phone: params.surgical_crm_phone,
    surgical_crm_website: params.surgical_crm_website,
    surgical_crm_status: params.surgical_crm_status ?? "prospect",
    surgical_crm_notes: params.surgical_crm_notes,
    surgical_crm_billing_city: params.surgical_crm_billing_city,
    surgical_crm_billing_state: params.surgical_crm_billing_state,
    surgical_crm_billing_postal_code: params.surgical_crm_billing_postal_code,
    surgical_crm_created_by: params.surgical_crm_created_by,
    surgical_crm_updated_at: now,
  };

  const { data: created, error } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .insert(insertRow)
    .select(SALES_ORGANIZATION_COLUMNS)
    .single();

  if (error || !created) {
    console.error("[insertSurgicalOrganizationAccount] insert failed", error);
    return { ok: false, error: error?.message || "Failed to create organization" };
  }

  return { ok: true, organization: created as unknown as Record<string, unknown> };
}
