import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { buildAccountIntelligence, type AccountIntelCase, type AccountIntelligence } from "./accountIntelligence";

export type SurgicalAccountIntelligenceBundle = {
  intelligence: AccountIntelligence;
  productNameById: Map<string, string>;
};
import { contactDisplayName } from "./labels";

const CHUNK = 400;
const CASE_INTEL_LIMIT = 12_000;

type ContactRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export async function fetchSurgicalAccountIntelligence(params: {
  accountId: string;
  salesRepId?: string;
  contacts: ContactRow[];
}): Promise<SurgicalAccountIntelligenceBundle> {
  const contactNameById = new Map<string, string>();
  for (const c of params.contacts) {
    if (c.id) contactNameById.set(String(c.id), contactDisplayName(c));
  }

  let countQuery = supabaseAdmin
    .from("surgical_sales_cases")
    .select("id", { count: "exact", head: true })
    .eq("account_id", params.accountId);
  if (params.salesRepId) {
    countQuery = countQuery.eq("sales_rep_id", params.salesRepId);
  }

  let rowsQuery = supabaseAdmin
    .from("surgical_sales_cases")
    .select("id, case_number, case_date, status, product_id, surgeon_contact_id, expected_revenue, created_at, updated_at")
    .eq("account_id", params.accountId)
    .limit(CASE_INTEL_LIMIT);
  if (params.salesRepId) {
    rowsQuery = rowsQuery.eq("sales_rep_id", params.salesRepId);
  }

  const [{ count: totalCaseCount, error: cErr }, { data: rawRows, error: rErr }] = await Promise.all([
    countQuery,
    rowsQuery,
  ]);

  if (cErr || rErr) {
    throw new Error(cErr?.message || rErr?.message || "Case intelligence query failed");
  }

  const cases: AccountIntelCase[] = (rawRows || []).map((r) => ({
    id: String((r as { id: string }).id),
    case_number: formatSurgicalCaseNumber(String((r as { case_number?: string }).case_number ?? "")),
    case_date: (r as { case_date?: string | null }).case_date ?? null,
    status: String((r as { status?: string }).status ?? ""),
    product_id: (r as { product_id?: string | null }).product_id != null ? String((r as { product_id: string }).product_id) : null,
    surgeon_contact_id:
      (r as { surgeon_contact_id?: string | null }).surgeon_contact_id != null
        ? String((r as { surgeon_contact_id: string }).surgeon_contact_id)
        : null,
    expected_revenue:
      (r as { expected_revenue?: number | string | null }).expected_revenue != null
        ? Number((r as { expected_revenue: number | string }).expected_revenue)
        : null,
    created_at: String((r as { created_at: string }).created_at),
    updated_at: String((r as { updated_at: string }).updated_at),
  }));

  const productIds = [...new Set(cases.map((c) => c.product_id).filter(Boolean))] as string[];
  const productNameById = new Map<string, string>();
  for (let i = 0; i < productIds.length; i += CHUNK) {
    const slice = productIds.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: prods } = await supabaseAdmin.from("surgical_sales_products").select("id, name").in("id", slice);
    for (const p of prods || []) {
      productNameById.set(String((p as { id: string }).id), String((p as { name?: string | null }).name ?? "—"));
    }
  }

  const intelligence = buildAccountIntelligence({
    totalCaseCount: typeof totalCaseCount === "number" ? totalCaseCount : cases.length,
    cases,
    contactNameById,
    productNameById,
  });
  return { intelligence, productNameById };
}
