import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSalesCrmTeamMember } from "@/lib/sales/isSalesCrmTeamMember";
import {
  SALES_ORGANIZATION_DIRECTORY_OR_FILTER,
  SALES_ORGANIZATIONS_TABLE,
  salesOrganizationHasDirectoryMetadata,
} from "@/lib/surgical-sales/salesOrganizationTable";

const ORG_LIST_CAP = 2500;

export {
  SALES_ORGANIZATION_DIRECTORY_OR_FILTER as SURGICAL_CRM_DIRECTORY_OR_FILTER,
  salesOrganizationHasDirectoryMetadata as accountHasSurgicalCrmDirectoryMetadata,
};

/**
 * Sales Command organizations are rows in sales_organizations (not ordering accounts).
 * Active org = not CRM-archived and not CRM-inactive.
 */
export async function accountIsActiveSurgicalOrganization(accountId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .select("id, surgical_crm_status, surgical_crm_archived_at")
    .eq("id", accountId)
    .maybeSingle();
  if (error || !data) return false;
  const row = data as { surgical_crm_archived_at?: string | null; surgical_crm_status?: string | null };
  if (row.surgical_crm_archived_at) return false;
  if (String(row.surgical_crm_status ?? "").toLowerCase() === "inactive") return false;
  return true;
}

type SurgicalOrganizationDirectoryRow = {
  id: string;
  surgical_crm_status?: string | null;
  surgical_crm_created_by?: string | null;
  surgical_crm_type?: string | null;
};

function isActiveSurgicalOrganizationRow(row: SurgicalOrganizationDirectoryRow): boolean {
  if (String(row.surgical_crm_status ?? "").toLowerCase() === "inactive") return false;
  return salesOrganizationHasDirectoryMetadata(row);
}

/** Reporting attribution: org creator (does not gate team visibility). */
export function salesOrganizationOwnedByRep(
  userId: string,
  row: { surgical_crm_created_by?: string | null },
): boolean {
  const createdBy = row.surgical_crm_created_by ? String(row.surgical_crm_created_by) : "";
  return createdBy !== "" && createdBy === userId;
}

/** IDs of active Sales Command organizations (for directory lists and search scoping). */
export async function loadActiveSurgicalOrganizationIds(userId?: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .select("id, surgical_crm_status, surgical_crm_created_by, surgical_crm_type")
    .is("surgical_crm_archived_at", null)
    .or(SALES_ORGANIZATION_DIRECTORY_OR_FILTER)
    .limit(ORG_LIST_CAP);
  if (error || !data) return new Set();

  const rows = (data as SurgicalOrganizationDirectoryRow[]).filter(isActiveSurgicalOrganizationRow);
  if (!userId || (await isSalesCrmTeamMember(userId))) {
    return new Set(rows.map((row) => String(row.id)));
  }

  return new Set(rows.filter((row) => salesOrganizationOwnedByRep(userId, row)).map((row) => String(row.id)));
}

type AccountGateRow = {
  surgical_crm_archived_at?: string | null;
  surgical_crm_status?: string | null;
  surgical_crm_created_by?: string | null;
  surgical_crm_type?: string | null;
};

/**
 * Internal sales reps may open cases, contacts, and org detail for Sales Command organizations.
 * Pass `allowArchived` to read archived organizations (directory filter / detail with flag).
 */
export async function repCanViewSurgicalAccount(
  userId: string,
  accountId: string,
  opts?: { allowArchived?: boolean },
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .select("id, surgical_crm_status, surgical_crm_archived_at, surgical_crm_created_by, surgical_crm_type")
    .eq("id", accountId)
    .maybeSingle();
  if (error || !data) return false;
  const row = data as AccountGateRow;
  if (!salesOrganizationHasDirectoryMetadata(row)) return false;
  if (row.surgical_crm_archived_at && !opts?.allowArchived) return false;
  if (String(row.surgical_crm_status ?? "").toLowerCase() === "inactive") return false;
  return isSalesCrmTeamMember(userId);
}
