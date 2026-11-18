import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  CASE_PROCEDURE_TEMPLATE_SPECS,
  type ResolvedCaseProcedureTemplate,
  type ResolvedCaseProcedureTemplateLine,
} from "./caseProcedureTemplateSpecs";

export type { ResolvedCaseProcedureTemplate, ResolvedCaseProcedureTemplateLine } from "./caseProcedureTemplateSpecs";

function normName(s: string) {
  return s.trim().toLowerCase();
}

/**
 * Resolves catalog rows for each template. A template is omitted if any line cannot be matched
 * to a product + SKU.
 */
export async function resolveCaseProcedureTemplates(): Promise<ResolvedCaseProcedureTemplate[]> {
  const { data: products, error: pErr } = await supabaseAdmin
    .from("surgical_sales_products")
    .select("id, name, active");

  if (pErr || !products?.length) {
    return [];
  }

  const productNameById = new Map<string, string>();
  const productIdByNorm = new Map<string, string>();
  for (const p of products) {
    const row = p as { id: string; name: string };
    const id = String(row.id);
    const name = String(row.name ?? "");
    productNameById.set(id, name);
    productIdByNorm.set(normName(name), id);
  }

  const allSkuCodes = [...new Set(CASE_PROCEDURE_TEMPLATE_SPECS.flatMap((t) => t.lines.map((l) => l.sku.trim())))];
  const { data: skuRows, error: sErr } = await supabaseAdmin
    .from("surgical_sales_product_skus")
    .select("id, sku, product_id, description, active")
    .in("sku", allSkuCodes);

  if (sErr || !skuRows?.length) {
    return [];
  }

  type SkuRow = { id: string; sku: string; product_id: string; description: string | null; active?: boolean };
  const skuByProductAndCode = new Map<string, SkuRow>();
  for (const s of skuRows as SkuRow[]) {
    const key = `${String(s.product_id)}::${String(s.sku).trim()}`;
    skuByProductAndCode.set(key, s);
  }

  const out: ResolvedCaseProcedureTemplate[] = [];

  for (const spec of CASE_PROCEDURE_TEMPLATE_SPECS) {
    const lines: ResolvedCaseProcedureTemplateLine[] = [];
    let ok = true;
    for (const ln of spec.lines) {
      const pid = productIdByNorm.get(normName(ln.product_name));
      if (!pid) {
        ok = false;
        break;
      }
      const skuRow = skuByProductAndCode.get(`${pid}::${ln.sku.trim()}`);
      if (!skuRow) {
        ok = false;
        break;
      }
      lines.push({
        product_id: pid,
        product_name: productNameById.get(pid) || ln.product_name,
        sku_id: skuRow.id,
        sku: skuRow.sku,
        description: skuRow.description,
        expected_quantity: ln.expected_quantity,
      });
    }
    if (ok && lines.length > 0) {
      out.push({
        id: spec.id,
        label: spec.label,
        description: spec.description,
        procedure_type: spec.procedure_type,
        lines,
      });
    }
  }

  return out;
}
