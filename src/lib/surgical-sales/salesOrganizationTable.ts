/** Sales Command organizations — separate from ordering customer `accounts`. */
export const SALES_ORGANIZATIONS_TABLE = "sales_organizations";

/** Supabase select fragment for a sales organization row. */
export const SALES_ORGANIZATION_COLUMNS = [
  "id",
  "name",
  "discount_percent",
  "surgical_crm_type",
  "surgical_crm_billing_address",
  "surgical_crm_shipping_address",
  "surgical_crm_phone",
  "surgical_crm_website",
  "surgical_crm_status",
  "surgical_crm_notes",
  "surgical_crm_created_by",
  "surgical_crm_updated_at",
  "surgical_crm_archived_at",
  "surgical_crm_archived_by",
  "surgical_crm_billing_city",
  "surgical_crm_billing_state",
  "surgical_crm_billing_postal_code",
  "linked_ordering_account_id",
  "created_at",
].join(", ");

/** @deprecated Use SALES_ORGANIZATION_COLUMNS */
export const SURGICAL_CRM_ACCOUNT_COLUMNS = SALES_ORGANIZATION_COLUMNS;

/** PostgREST OR filter: row belongs to the Sales Command organization directory. */
export const SALES_ORGANIZATION_DIRECTORY_OR_FILTER =
  "surgical_crm_created_by.not.is.null,surgical_crm_type.not.is.null,surgical_crm_status.not.is.null";

/** @deprecated Use SALES_ORGANIZATION_DIRECTORY_OR_FILTER */
export const SURGICAL_CRM_DIRECTORY_OR_FILTER = SALES_ORGANIZATION_DIRECTORY_OR_FILTER;

export function salesOrganizationHasDirectoryMetadata(row: {
  surgical_crm_created_by?: string | null;
  surgical_crm_type?: string | null;
  surgical_crm_status?: string | null;
}): boolean {
  if (row.surgical_crm_created_by != null && String(row.surgical_crm_created_by).trim() !== "") return true;
  if (row.surgical_crm_type != null && String(row.surgical_crm_type).trim() !== "") return true;
  if (row.surgical_crm_status != null && String(row.surgical_crm_status).trim() !== "") return true;
  return false;
}

/** @deprecated Use salesOrganizationHasDirectoryMetadata */
export const accountHasSurgicalCrmDirectoryMetadata = salesOrganizationHasDirectoryMetadata;
