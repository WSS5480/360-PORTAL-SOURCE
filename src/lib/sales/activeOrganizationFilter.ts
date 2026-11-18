import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";

type OppLike = { account_id?: string | null };

export async function filterOpportunitiesByActiveOrganization<T extends OppLike>(rows: T[]): Promise<T[]> {
  const accountIds = [...new Set(rows.map((r) => String(r.account_id || "").trim()).filter(Boolean))];
  if (accountIds.length === 0) return rows;
  const { data } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .select("id, surgical_crm_archived_at")
    .in("id", accountIds);
  const activeIds = new Set(
    ((data || []) as { id: string; surgical_crm_archived_at?: string | null }[])
      .filter((a) => !a.surgical_crm_archived_at)
      .map((a) => String(a.id)),
  );
  return rows.filter((r) => {
    const aid = String(r.account_id || "").trim();
    if (!aid) return true;
    return activeIds.has(aid);
  });
}
