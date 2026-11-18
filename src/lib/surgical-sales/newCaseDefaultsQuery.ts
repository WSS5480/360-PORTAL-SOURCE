import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import {
  cleanProcedureSuggestions,
  collectQuickAddProcedureSuggestions,
  priorCaseProcedureTypesFromRows,
} from "@/lib/surgical-sales/quickAddProcedureSuggestions";

export type SurgicalNewCaseRecentRow = {
  id: string;
  case_number: string;
  case_date: string | null;
  status: string;
  product_id: string | null;
  product_name: string | null;
  procedure_type: string | null;
};

export type SurgicalNewCaseSkuRank = { sku_id: string; count: number };

export type SurgicalNewCaseDefaults = {
  preferred_surgeon_contact_id: string | null;
  sku_rank: SurgicalNewCaseSkuRank[];
  suggested_expected_quantity: number | null;
  suggested_procedure_type: string | null;
  procedure_suggestions: string[];
  recent_cases: SurgicalNewCaseRecentRow[];
};

function medianPositiveRounded(values: number[]): number | null {
  const ints = values
    .map((v) => Math.round(Number(v)))
    .filter((v) => Number.isFinite(v) && v > 0 && v <= 1_000_000);
  if (ints.length === 0) return null;
  ints.sort((a, b) => a - b);
  const mid = Math.floor(ints.length / 2);
  if (ints.length % 2 === 1) return ints[mid]!;
  return Math.round((ints[mid - 1]! + ints[mid]!) / 2);
}

function tallySurgeon(rows: { surgeon_contact_id: string | null }[]): string | null {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const id = r.surgeon_contact_id ? String(r.surgeon_contact_id) : "";
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN) {
      best = id;
      bestN = n;
    }
  }
  return best;
}

export async function loadSurgicalNewCaseDefaults(params: {
  repUserId: string;
  accountId: string | null;
  productId: string | null;
  surgeonContactId?: string | null;
}): Promise<SurgicalNewCaseDefaults> {
  const out: SurgicalNewCaseDefaults = {
    preferred_surgeon_contact_id: null,
    sku_rank: [],
    suggested_expected_quantity: null,
    suggested_procedure_type: null,
    procedure_suggestions: [],
    recent_cases: [],
  };

  const { repUserId, accountId, productId, surgeonContactId } = params;

  if (surgeonContactId) {
    const [{ data: contact }, { data: surgeonCases }] = await Promise.all([
      supabaseAdmin
        .from("surgical_sales_contacts")
        .select(
          "provider_procedure_focus, provider_ideal_observation_cases, provider_observation_best_days_case_types, provider_commercial_intelligence",
        )
        .eq("id", surgeonContactId)
        .maybeSingle(),
      supabaseAdmin
        .from("surgical_sales_cases")
        .select("procedure_type, case_date, created_at")
        .eq("surgeon_contact_id", surgeonContactId)
        .neq("status", "cancelled")
        .order("case_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const surgeonPriorProcedures = priorCaseProcedureTypesFromRows(surgeonCases ?? []);
    const suggestions = collectQuickAddProcedureSuggestions(
      (contact as Record<string, unknown> | null) ?? null,
      null,
      surgeonPriorProcedures,
    );
    // Prior cases first so a procedure typed on the last observation/product case surfaces next.
    out.procedure_suggestions = cleanProcedureSuggestions([
      ...surgeonPriorProcedures,
      ...out.procedure_suggestions,
      ...suggestions,
    ]);
    if (surgeonPriorProcedures[0]) {
      out.suggested_procedure_type = surgeonPriorProcedures[0];
    }
  }

  const { data: userProcedureRows } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("procedure_type, case_date, created_at")
    .eq("sales_rep_id", repUserId)
    .neq("status", "cancelled")
    .not("procedure_type", "is", null)
    .order("case_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(80);

  const userPriorProcedures = priorCaseProcedureTypesFromRows(userProcedureRows ?? []);
  out.procedure_suggestions = cleanProcedureSuggestions([
    ...out.procedure_suggestions,
    ...userPriorProcedures,
  ]);
  if (!out.suggested_procedure_type && out.procedure_suggestions[0]) {
    out.suggested_procedure_type = out.procedure_suggestions[0];
  }

  if (accountId) {
    const { data: recent, error: recentErr } = await supabaseAdmin
      .from("surgical_sales_cases")
      .select("id, case_number, case_date, status, product_id, procedure_type")
      .eq("sales_rep_id", repUserId)
      .eq("account_id", accountId)
      .neq("status", "cancelled")
      .order("case_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    if (!recentErr && recent && recent.length > 0) {
      const productIds = [...new Set(recent.map((r) => (r as { product_id?: string | null }).product_id).filter(Boolean))] as string[];
      const productNameBy = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: prods } = await supabaseAdmin.from("surgical_sales_products").select("id, name").in("id", productIds);
        for (const p of prods || []) {
          productNameBy.set(String((p as { id: string }).id), String((p as { name?: string | null }).name ?? ""));
        }
      }
      out.recent_cases = recent.map((r) => {
        const row = r as {
          id: string;
          case_number: string;
          case_date: string | null;
          status: string;
          product_id: string | null;
          procedure_type: string | null;
        };
        const pid = row.product_id ? String(row.product_id) : null;
        return {
          id: row.id,
          case_number: formatSurgicalCaseNumber(row.case_number),
          case_date: row.case_date,
          status: row.status,
          product_id: pid,
          product_name: pid ? productNameBy.get(pid) ?? null : null,
          procedure_type: row.procedure_type ? String(row.procedure_type) : null,
        };
      });

      const proc = out.recent_cases.find((c) => c.procedure_type && String(c.procedure_type).trim());
      if (proc?.procedure_type?.trim() && !out.suggested_procedure_type) {
        out.suggested_procedure_type = proc.procedure_type.trim();
      }
      out.procedure_suggestions = cleanProcedureSuggestions([
        ...out.procedure_suggestions,
        ...out.recent_cases.map((c) => c.procedure_type),
      ]);
    }

    const { data: surgeonRows } = await supabaseAdmin
      .from("surgical_sales_cases")
      .select("surgeon_contact_id")
      .eq("sales_rep_id", repUserId)
      .eq("account_id", accountId)
      .neq("status", "cancelled")
      .not("surgeon_contact_id", "is", null)
      .limit(400);

    out.preferred_surgeon_contact_id = tallySurgeon((surgeonRows || []) as { surgeon_contact_id: string | null }[]);
  }

  if (productId) {
    let caseQuery = supabaseAdmin
      .from("surgical_sales_cases")
      .select("id, account_id")
      .eq("sales_rep_id", repUserId)
      .neq("status", "cancelled")
      .order("case_date", { ascending: false })
      .limit(450);

    if (accountId) {
      caseQuery = caseQuery.eq("account_id", accountId);
    }

    const { data: caseRows, error: caseErr } = await caseQuery;
    if (!caseErr && caseRows && caseRows.length > 0) {
      const caseIds = caseRows.map((r) => String((r as { id: string }).id)).slice(0, 120);
      const { data: lines } = await supabaseAdmin
        .from("surgical_sales_case_products")
        .select("sku_id, expected_quantity, case_id")
        .in("case_id", caseIds)
        .eq("product_id", productId);

      const skuCounts = new Map<string, number>();
      const qtys: number[] = [];
      const accountBoost = accountId
        ? new Set(caseRows.filter((r) => String((r as { account_id: string }).account_id) === accountId).map((r) => String((r as { id: string }).id)))
        : null;

      for (const row of lines || []) {
        const sku = (row as { sku_id?: string | null }).sku_id;
        const eq = (row as { expected_quantity?: number | null }).expected_quantity;
        const cid = String((row as { case_id: string }).case_id);
        if (eq != null && Number(eq) > 0) qtys.push(Number(eq));

        if (!sku) continue;
        const sid = String(sku);
        let w = 1;
        if (accountBoost?.has(cid)) w += 2;
        skuCounts.set(sid, (skuCounts.get(sid) || 0) + w);
      }

      out.sku_rank = [...skuCounts.entries()]
        .map(([sku_id, count]) => ({ sku_id, count }))
        .sort((a, b) => b.count - a.count || a.sku_id.localeCompare(b.sku_id));

      out.suggested_expected_quantity = medianPositiveRounded(qtys);
    }
  }

  return out;
}
