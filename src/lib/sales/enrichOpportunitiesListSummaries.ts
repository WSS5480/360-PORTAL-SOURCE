import { supabaseAdmin } from "@/lib/supabase/admin";

export type OpportunityListSummaryFields = {
  linked_cases_count: number;
  linked_engagements_count: number;
};

export async function enrichOpportunitiesListSummaries<T extends Record<string, unknown>>(
  rows: T[],
): Promise<Array<T & OpportunityListSummaryFields>> {
  const ids = rows.map((r) => String(r.id || "")).filter(Boolean);
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, linked_cases_count: 0, linked_engagements_count: 0 }));
  }

  const [engRes, caseRes] = await Promise.all([
    supabaseAdmin
      .from("surgical_sales_engagements")
      .select("opportunity_id")
      .in("opportunity_id", ids)
      .is("archived_at", null),
    supabaseAdmin
      .from("surgical_sales_cases")
      .select("related_opportunity_id")
      .in("related_opportunity_id", ids)
      .is("archived_at", null),
  ]);

  const engagementCount = new Map<string, number>();
  for (const row of engRes.data || []) {
    const oid = String((row as { opportunity_id?: string }).opportunity_id || "");
    if (!oid) continue;
    engagementCount.set(oid, (engagementCount.get(oid) || 0) + 1);
  }

  const caseCount = new Map<string, number>();
  for (const row of caseRes.data || []) {
    const oid = String((row as { related_opportunity_id?: string }).related_opportunity_id || "");
    if (!oid) continue;
    caseCount.set(oid, (caseCount.get(oid) || 0) + 1);
  }

  return rows.map((r) => {
    const id = String(r.id || "");
    return {
      ...r,
      linked_cases_count: caseCount.get(id) || 0,
      linked_engagements_count: engagementCount.get(id) || 0,
    };
  });
}
