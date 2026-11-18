import { supabaseAdmin } from "@/lib/supabase/admin";
import { enrichOpportunitiesWithProductName } from "@/lib/sales/enrichOpportunitiesWithProductName";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { formatEngagementStatus, formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { salesStageLabel } from "@/lib/sales/stages";
import { contactMatchesPhysicianName } from "@/lib/surgical-sales/providerDirectory";
import { loadContactOrganizationIds } from "@/lib/surgical-sales/crmEntityRelationships";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LinkedEngagementSummary = {
  id: string;
  title?: string | null;
  engagement_type: string;
  engagement_type_label: string;
  status: string;
  status_label: string;
  engagement_date?: string | null;
  organization_name?: string | null;
};

export type LinkedCaseSummary = {
  id: string;
  case_number: string;
  case_date?: string | null;
  status: string;
  case_type?: string | null;
  procedure_type?: string | null;
};

export type LinkedOpportunitySummary = {
  id: string;
  account_name: string;
  physician_name?: string | null;
  stage: string;
  stage_label: string;
  product_line?: string | null;
  product_display?: string | null;
  value_cents?: number;
  updated_at?: string | null;
};

export async function loadLinkedEngagementsForOpportunity(opportunityId: string): Promise<LinkedEngagementSummary[]> {
  if (!UUID_RE.test(opportunityId)) return [];

  const { data: opp } = await supabaseAdmin
    .from("sales_opportunities")
    .select("source_engagement_id")
    .eq("id", opportunityId)
    .maybeSingle();

  const { data: rows } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("id, title, engagement_type, status, engagement_date, organization_id, accounts:organization_id(name)")
    .eq("opportunity_id", opportunityId)
    .is("archived_at", null)
    .order("engagement_date", { ascending: false, nullsFirst: false })
    .limit(100);

  const byId = new Map<string, Record<string, unknown>>();
  for (const row of (rows || []) as Array<Record<string, unknown>>) {
    byId.set(String(row.id), row);
  }

  const sourceId = String((opp as { source_engagement_id?: string | null } | null)?.source_engagement_id || "").trim();
  if (UUID_RE.test(sourceId) && !byId.has(sourceId)) {
    const { data: sourceRow } = await supabaseAdmin
      .from("surgical_sales_engagements")
      .select("id, title, engagement_type, status, engagement_date, organization_id, accounts:organization_id(name)")
      .eq("id", sourceId)
      .maybeSingle();
    if (sourceRow) byId.set(sourceId, sourceRow as Record<string, unknown>);
  }

  return [...byId.values()].map((row) => {
    const acct = row.accounts as { name?: string | null } | null;
    return {
      id: String(row.id),
      title: row.title ? String(row.title) : null,
      engagement_type: String(row.engagement_type || ""),
      engagement_type_label: formatEngagementType(String(row.engagement_type || "")),
      status: String(row.status || ""),
      status_label: formatEngagementStatus(String(row.status || "")),
      engagement_date: row.engagement_date ? String(row.engagement_date) : null,
      organization_name: acct?.name ? String(acct.name) : null,
    };
  });
}

export async function loadLinkedCasesForOpportunity(opportunityId: string): Promise<LinkedCaseSummary[]> {
  if (!UUID_RE.test(opportunityId)) return [];

  const { data } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("id, case_number, case_date, status, case_type, procedure_type")
    .eq("related_opportunity_id", opportunityId)
    .is("archived_at", null)
    .order("case_date", { ascending: false, nullsFirst: false })
    .limit(100);

  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    case_number: formatSurgicalCaseNumber(String(row.case_number ?? "")) || String(row.id).slice(0, 8),
    case_date: row.case_date ? String(row.case_date) : null,
    status: String(row.status || ""),
    case_type: row.case_type ? String(row.case_type) : null,
    procedure_type: row.procedure_type ? String(row.procedure_type) : null,
  }));
}

export async function loadOpportunitiesForOrganization(
  accountId: string,
  ownerUserId?: string,
): Promise<LinkedOpportunitySummary[]> {
  if (!UUID_RE.test(accountId)) return [];

  let query = supabaseAdmin
    .from("sales_opportunities")
    .select("id, account_id, account_name, physician_name, stage, product_line, value_cents, updated_at")
    .eq("account_id", accountId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (ownerUserId) {
    query = query.eq("owner_user_id", ownerUserId);
  }

  const { data } = await query;
  const enriched = await enrichOpportunitiesWithProductName((data || []) as Record<string, unknown>[]);

  return enriched.map((row) => ({
    id: String(row.id),
    account_name: String(row.account_name || "Evaluation"),
    physician_name: row.physician_name ? String(row.physician_name) : null,
    stage: String(row.stage || ""),
    stage_label: salesStageLabel(String(row.stage || "")),
    product_line: row.product_line ? String(row.product_line) : null,
    product_display: row.product_display ? String(row.product_display) : null,
    value_cents: typeof row.value_cents === "number" ? row.value_cents : 0,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  }));
}

export async function loadOpportunitiesForProvider(
  providerId: string,
  _ownerUserId: string,
  contact: { first_name?: string | null; last_name?: string | null; physician_name?: string | null },
): Promise<LinkedOpportunitySummary[]> {
  if (!UUID_RE.test(providerId)) return [];

  const orgIds = await loadContactOrganizationIds(providerId);
  const { data: oppsRaw } = await supabaseAdmin
    .from("sales_opportunities")
    .select("id, account_id, account_name, physician_name, surgeon_contact_id, stage, product_line, value_cents, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  const filtered = ((oppsRaw || []) as Array<Record<string, unknown>>).filter((o) => {
    if (String(o.surgeon_contact_id || "") === providerId) return true;
    const aid = String(o.account_id || "");
    const nameMatch = contactMatchesPhysicianName(contact as never, String(o.physician_name || ""));
    return nameMatch || (aid && orgIds.has(aid));
  });

  const enriched = await enrichOpportunitiesWithProductName(filtered);
  return enriched.map((row) => ({
    id: String(row.id),
    account_name: String(row.account_name || "Evaluation"),
    physician_name: row.physician_name ? String(row.physician_name) : null,
    stage: String(row.stage || ""),
    stage_label: salesStageLabel(String(row.stage || "")),
    product_line: row.product_line ? String(row.product_line) : null,
    product_display: row.product_display ? String(row.product_display) : null,
    value_cents: typeof row.value_cents === "number" ? row.value_cents : 0,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  }));
}

export async function linkEngagementToOpportunity(params: {
  engagementId: string;
  opportunityId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const engagementId = String(params.engagementId || "").trim();
  if (!UUID_RE.test(engagementId)) return { ok: false, error: "Invalid engagement id" };

  const { error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      opportunity_id: params.opportunityId && UUID_RE.test(params.opportunityId) ? params.opportunityId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", engagementId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function linkCaseToOpportunity(params: {
  caseId: string;
  opportunityId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const caseId = String(params.caseId || "").trim();
  if (!UUID_RE.test(caseId)) return { ok: false, error: "Invalid case id" };

  const { error } = await supabaseAdmin
    .from("surgical_sales_cases")
    .update({
      related_opportunity_id: params.opportunityId && UUID_RE.test(params.opportunityId) ? params.opportunityId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
