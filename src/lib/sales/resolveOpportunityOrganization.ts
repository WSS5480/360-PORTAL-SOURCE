import { supabaseAdmin } from "@/lib/supabase/admin";
import { insertSurgicalOrganizationAccount } from "@/lib/surgical-sales/insertSurgicalOrganizationAccount";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";

type ResolveInput = {
  accountId?: string | null;
  accountName?: string | null;
  actorUserId: string;
};

type ResolveResult = { ok: true; accountId: string; accountName: string } | { ok: false; error: string };

export async function resolveOpportunityOrganization(input: ResolveInput): Promise<ResolveResult> {
  const name = String(input.accountName ?? "").trim();
  const explicitId = String(input.accountId ?? "").trim();

  if (explicitId) {
    const { data, error } = await supabaseAdmin
      .from(SALES_ORGANIZATIONS_TABLE)
      .select("id, name, surgical_crm_archived_at, surgical_crm_status")
      .eq("id", explicitId)
      .maybeSingle();
    if (error || !data) return { ok: false, error: "Selected organization was not found." };
    if ((data as { surgical_crm_archived_at?: string | null }).surgical_crm_archived_at) {
      return { ok: false, error: "Selected organization is archived." };
    }
    if (String((data as { surgical_crm_status?: string | null }).surgical_crm_status ?? "").toLowerCase() === "inactive") {
      return { ok: false, error: "Selected organization is inactive." };
    }
    return {
      ok: true,
      accountId: String((data as { id: string }).id),
      accountName: String((data as { name?: string | null }).name ?? "").trim() || name || "Organization",
    };
  }

  if (!name) return { ok: false, error: "Organization is required." };

  const { data: exactActiveRows, error: exactActiveErr } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .select("id, name, surgical_crm_archived_at, surgical_crm_status")
    .ilike("name", name)
    .is("surgical_crm_archived_at", null)
    .neq("surgical_crm_status", "inactive")
    .limit(200);
  if (exactActiveErr) return { ok: false, error: exactActiveErr.message };
  const exactActive = ((exactActiveRows || []) as { id: string; name?: string | null }[]).find(
    (r) => String(r.name ?? "").trim().toLowerCase() === name.toLowerCase(),
  );
  if (exactActive) {
    return {
      ok: true,
      accountId: exactActive.id,
      accountName: String(exactActive.name ?? name).trim() || name,
    };
  }

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .select("id, name, surgical_crm_archived_at, surgical_crm_status")
    .ilike("name", name)
    .limit(200);
  if (existingErr) return { ok: false, error: existingErr.message };

  const exactMatches = ((existing || []) as {
    id: string;
    name?: string | null;
    surgical_crm_archived_at?: string | null;
    surgical_crm_status?: string | null;
  }[]).filter((r) => String(r.name ?? "").trim().toLowerCase() === name.toLowerCase());
  const activeExact = exactMatches.find(
    (r) => !r.surgical_crm_archived_at && String(r.surgical_crm_status ?? "").toLowerCase() !== "inactive",
  );
  if (activeExact) {
    return { ok: true, accountId: activeExact.id, accountName: String(activeExact.name ?? name).trim() || name };
  }

  const created = await insertSurgicalOrganizationAccount({
    name,
    discount_percent: 0,
    surgical_crm_type: "other",
    surgical_crm_billing_address: null,
    surgical_crm_shipping_address: null,
    surgical_crm_phone: null,
    surgical_crm_website: null,
    surgical_crm_status: "active",
    surgical_crm_notes: null,
    surgical_crm_billing_city: null,
    surgical_crm_billing_state: null,
    surgical_crm_billing_postal_code: null,
    surgical_crm_created_by: input.actorUserId,
  });
  if (!created.ok) return { ok: false, error: created.error };

  return {
    ok: true,
    accountId: String((created.organization as { id: string }).id),
    accountName: String((created.organization as { name?: string | null }).name ?? name),
  };
}
